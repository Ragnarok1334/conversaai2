import 'server-only'
import { createHash } from 'node:crypto'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { detectHumanHandoffRequest, HUMAN_HANDOFF_ACK } from '@/lib/handoff'
import { consumeMessageCredit } from '@/lib/security'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { getModelForPlan } from '@/lib/ai/model-router'
import { getPlanConfig, normalizePlan } from '@/lib/plans'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { createUserNotification } from '@/lib/notifications'
import { normalizeWhatsAppConfig, isInsideBusinessHours } from '@/lib/whatsapp/config'
import { FacebookGraphError, sendFacebookText } from './client'

type MessagingEvent = {
  sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number
  message?: { mid?: string; text?: string; is_echo?: boolean }
  postback?: { mid?: string; payload?: string; title?: string }
  delivery?: { mids?: string[]; watermark?: number }
  read?: { watermark?: number }
}
export type FacebookWebhookPayload = { object?: string; entry?: Array<{ id?: string; time?: number; messaging?: MessagingEvent[] }> }
type Channel = { id: string; user_id: string; assistant_id: string; page_id: string; encrypted_page_access_token: string; config?: unknown }
type Conversation = { id: string }
type ReplySenderType = 'ai' | 'system'

class FacebookDeliveryPersistenceError extends Error {
  constructor(public readonly deliveryStatus: 'pending' | 'accepted' | 'failed') {
    super(`No se pudo persistir el estado ${deliveryStatus} de la entrega de Facebook.`)
    this.name = 'FacebookDeliveryPersistenceError'
  }
}

function safeText(event: MessagingEvent) {
  const value = event.message?.text || event.postback?.title || event.postback?.payload
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 2000) : null
}

function assistantConfig(row: Record<string, unknown>): AssistantConfig {
  return {
    assistantName: String(row.assistant_name || ''), businessName: String(row.business_name || ''),
    businessType: String(row.business_type || ''), channel: 'facebook', tone: String(row.tone || 'profesional'),
    mainGoal: String(row.main_goal || ''), instructions: String(row.instructions || ''), faqs: String(row.faqs || ''),
    services: String(row.services || ''), schedule: String(row.schedule || ''), fallbackMessage: String(row.fallback_message || ''),
    language: String(row.language || 'es'), behavior: row.behavior || undefined,
    knowledge_blocks: row.knowledge_blocks as AssistantConfig['knowledge_blocks'],
  }
}

async function recordEvent(providerId: string, channelId: string | null, type: string, raw: string) {
  const { data, error } = await createSupabaseAdmin().from('facebook_webhook_events').insert({
    provider_event_id: providerId, channel_id: channelId, event_type: type,
    payload_hash: createHash('sha256').update(raw).digest('hex'),
  }).select('id').maybeSingle()
  if (error?.code === '23505') return null
  if (error) throw error
  return data?.id as string | undefined
}

async function finish(id: string | undefined, status: 'processed' | 'ignored' | 'failed', code?: string) {
  if (!id) return
  // Transición atómica: solo el primer ejecutor con status='received' puede finalizar el evento.
  await createSupabaseAdmin().from('facebook_webhook_events').update({ status, error_code: code?.slice(0, 80) || null, processed_at: new Date().toISOString() }).eq('id', id).eq('status', 'received')
}

function graphErrorMetadata(error: unknown) {
  if (!(error instanceof FacebookGraphError)) return { delivery_error: 'facebook_delivery_failed' }
  return {
    delivery_error: error.code === 190 ? 'facebook_token_error' : 'facebook_graph_error',
    ...(error.code ? { facebook_error_code: error.code } : {}),
    ...(error.subcode ? { facebook_error_subcode: error.subcode } : {}),
    ...(error.graphType ? { facebook_error_type: error.graphType.slice(0, 80) } : {}),
    ...(error.traceId ? { facebook_trace_id: error.traceId.slice(0, 120) } : {}),
  }
}

function runtimeErrorCode(stage: string, error: unknown) {
  if (error instanceof FacebookDeliveryPersistenceError) return `facebook_delivery_persistence_${error.deliveryStatus}`
  if (!(error instanceof FacebookGraphError)) return stage
  const kind = error.code === 190 ? 'facebook_token_error' : 'facebook_graph_error'
  return [kind, error.code, error.subcode].filter(value => value !== undefined).join('_').slice(0, 80)
}

async function persistAndDeliverReply({
  admin,
  channel,
  conversation,
  recipientId,
  content,
  senderType,
  metadata = {},
}: {
  admin: ReturnType<typeof createSupabaseAdmin>
  channel: Channel
  conversation: Conversation
  recipientId: string
  content: string
  senderType: ReplySenderType
  metadata?: Record<string, unknown>
}) {
  const attemptedAt = new Date().toISOString()
  const pendingMetadata = { ...metadata, delivery_status: 'pending', delivery_attempted_at: attemptedAt }
  const pending = await admin.from('messages').insert({
    conversation_id: conversation.id,
    user_id: channel.user_id,
    assistant_id: channel.assistant_id,
    channel: 'facebook',
    role: 'assistant',
    sender_type: senderType,
    content,
    metadata: pendingMetadata,
  }).select('id').single()
  if (pending.error || !pending.data?.id) throw new FacebookDeliveryPersistenceError('pending')

  const conversationUpdate = await admin.from('conversations').update({
    last_message: content.slice(0, 100),
    last_message_at: attemptedAt,
  }).eq('id', conversation.id).eq('user_id', channel.user_id)
  if (conversationUpdate.error) {
    console.error('[Facebook delivery] conversation_update_failed')
  }

  try {
    const sent = await sendFacebookText(channel, recipientId, content)
    const accepted = await admin.from('messages').update({
      provider_message_id: sent.message_id,
      metadata: { ...pendingMetadata, delivery_status: 'accepted', delivery_updated_at: new Date().toISOString() },
    }).eq('id', pending.data.id).eq('user_id', channel.user_id)
    if (accepted.error) throw new FacebookDeliveryPersistenceError('accepted')
    const channelUpdate = await admin.from('facebook_channels').update({
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', channel.id).eq('user_id', channel.user_id)
    if (channelUpdate.error) console.error('[Facebook delivery] channel_status_update_failed')
    return sent
  } catch (error) {
    if (!(error instanceof FacebookDeliveryPersistenceError)) {
      const failed = await admin.from('messages').update({
        metadata: {
          ...pendingMetadata,
          ...graphErrorMetadata(error),
          delivery_status: 'failed',
          delivery_updated_at: new Date().toISOString(),
        },
      }).eq('id', pending.data.id).eq('user_id', channel.user_id)
      if (failed.error) console.error('[Facebook delivery] failed_status_persistence_failed')
    }
    throw error
  }
}

async function conversationFor(channel: Channel, psid: string, preview: string) {
  const admin = createSupabaseAdmin(); const now = new Date().toISOString()
  let { data: conversation } = await admin.from('conversations').select('*').eq('assistant_id', channel.assistant_id).eq('channel', 'facebook').eq('external_chat_id', psid).maybeSingle()
  if (!conversation) {
    const created = await admin.from('conversations').insert({
      user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'facebook', external_chat_id: psid,
      visitor_id: `fb_${psid}`.slice(0, 100), visitor_name: 'Contacto de Facebook', status: 'open',
      last_message: preview.slice(0, 100), last_message_at: now,
    }).select('*').single()
    if (created.error) throw created.error
    conversation = created.data
  } else {
    const updated = await admin.from('conversations').update({ last_message: preview.slice(0, 100), last_message_at: now, status: conversation.status === 'closed' ? 'open' : conversation.status }).eq('id', conversation.id).eq('user_id', channel.user_id).select('*').single()
    if (updated.data) conversation = updated.data
  }
  const { data: lead } = await admin.from('leads').select('id,email').eq('conversation_id', conversation.id).maybeSingle()
  if (!lead) {
    const created = await admin.from('leads').insert({ user_id: channel.user_id, assistant_id: channel.assistant_id, conversation_id: conversation.id, name: 'Contacto de Facebook', source: 'facebook', status: 'new', metadata: { psid } }).select('id').single()
    if (created.data) await createUserNotification({ userId: channel.user_id, title: 'Nuevo lead desde Facebook', message: 'Una persona inició una conversación en Messenger.', category: 'lead', actionUrl: '/dashboard/leads', metadata: { leadId: created.data.id, conversationId: conversation.id, channel: 'facebook' } })
  }
  return { conversation, lead }
}

async function processMessage(channel: Channel, event: MessagingEvent, raw: string) {
  const sender = event.sender?.id; const text = safeText(event); const providerId = event.message?.mid || event.postback?.mid || `${sender}:${event.timestamp}:${createHash('sha256').update(JSON.stringify(event)).digest('hex').slice(0, 16)}`
  if (!sender || sender === channel.page_id) return
  const eventId = await recordEvent(providerId, channel.id, event.postback ? 'postback' : 'message.text', raw)
  if (!eventId) return
  let stage = 'receive'
  try {
    if (!text || event.message?.is_echo) { await finish(eventId, 'ignored'); return }
    const admin = createSupabaseAdmin()
    const { data: assistant } = await admin.from('assistants').select('*').eq('id', channel.assistant_id).eq('user_id', channel.user_id).maybeSingle()
    if (!assistant || assistant.status !== 'active') { await finish(eventId, 'ignored', 'assistant_inactive'); return }
    const { conversation } = await conversationFor(channel, sender, text)
    const inbound = await admin.from('messages').insert({ conversation_id: conversation.id, user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'facebook', role: 'user', sender_type: 'visitor', content: text, provider_message_id: providerId, metadata: { facebook_type: event.postback ? 'postback' : 'text' } })
    if (inbound.error?.code === '23505') { await finish(eventId, 'ignored'); return }
    if (inbound.error) throw inbound.error

    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase().slice(0, 254)
    if (email) await admin.from('leads').update({ email, updated_at: new Date().toISOString() }).eq('conversation_id', conversation.id).eq('user_id', channel.user_id).is('email', null)
    const requestedHuman = detectHumanHandoffRequest(text); const config = normalizeWhatsAppConfig(channel.config)
    await createUserNotification({ userId: channel.user_id, title: requestedHuman ? 'Messenger solicita atención humana' : 'Nuevo mensaje de Messenger', message: `Contacto de Facebook: ${text.slice(0, 140)}`, category: 'conversation', actionUrl: '/dashboard/conversations', metadata: { assistantId: channel.assistant_id, conversationId: conversation.id, channel: 'facebook' } })
    if (conversation.ai_paused || (config.handoffEnabled && requestedHuman)) {
      if (requestedHuman && conversation.handoff_status === 'ai') {
        await admin.from('conversations').update({ ai_paused: true, handoff_status: 'waiting', status: 'pending', handoff_reason: 'El contacto solicitó atención humana por Messenger.', human_requested_at: new Date().toISOString() }).eq('id', conversation.id).eq('user_id', channel.user_id)
        const reply = config.handoffMessage || HUMAN_HANDOFF_ACK
        stage = 'facebook_delivery'
        await persistAndDeliverReply({ admin, channel, conversation, recipientId: sender, content: reply, senderType: 'system' })
      }
      await finish(eventId, 'processed'); return
    }
    if (!isInsideBusinessHours(config)) {
      stage = 'facebook_delivery'
      await persistAndDeliverReply({ admin, channel, conversation, recipientId: sender, content: config.awayMessage, senderType: 'system' })
      await admin.from('conversations').update({ status: 'pending' }).eq('id', conversation.id).eq('user_id', channel.user_id); await finish(eventId, 'processed'); return
    }
    const [{ data: subscription }, { data: profile }] = await Promise.all([
      admin.from('subscriptions').select('*').eq('user_id', channel.user_id).maybeSingle(), admin.from('profiles').select('trial_used,trial_ends_at').eq('id', channel.user_id).maybeSingle(),
    ])
    const plan = normalizePlan(subscription?.plan || 'free'); const planConfig = getPlanConfig(plan)
    if (!['active','past_due'].includes(getEffectiveSubscriptionStatus(subscription, profile)) || !planConfig.channels.facebook) { await finish(eventId, 'ignored', 'plan_inactive'); return }
    if (!await consumeMessageCredit(channel.user_id, planConfig.limits.messagesPerMonth)) { await finish(eventId, 'ignored', 'limit_reached'); return }
    const { data: rows } = await admin.from('messages').select('role,content').eq('conversation_id', conversation.id).in('role', ['user','assistant']).order('created_at', { ascending: false }).limit(12)
    const history = (rows || []).slice().reverse().map(item => ({ role: item.role as 'user'|'assistant', content: String(item.content).slice(0, 2000) }))
    if (history.at(-1)?.role === 'user' && history.at(-1)?.content === text) history.pop()
    stage = 'ai_generation'
    let reply: string
    let aiGenerationFailed = false
    try { reply = await generateAssistantReply(assistantConfig(assistant), text, getModelForPlan(plan, 'webchat_message', { messageLength: text.length }), history) }
    catch (error) {
      aiGenerationFailed = true
      console.error('[Facebook AI generation]', error instanceof Error ? error.name : 'unknown')
      reply = String(assistant.fallback_message || 'Tu mensaje llegó correctamente. Intenta nuevamente en unos segundos.')
    }
    if (config.welcomeEnabled && history.length === 0) reply = `${config.welcomeMessage}\n\n${reply}`
    stage = 'facebook_delivery'
    await persistAndDeliverReply({
      admin,
      channel,
      conversation,
      recipientId: sender,
      content: reply,
      senderType: 'ai',
      metadata: aiGenerationFailed ? { generation_status: 'failed', generation_error: 'ai_generation_failed' } : { generation_status: 'succeeded' },
    })
    if (aiGenerationFailed) {
      await admin.from('facebook_channels').update({ last_error: 'ai_generation_failed', updated_at: new Date().toISOString() }).eq('id', channel.id).eq('user_id', channel.user_id)
    }
    await finish(eventId, 'processed', aiGenerationFailed ? 'ai_generation_failed' : undefined)
  } catch (error) {
    console.error('[Facebook message]', error instanceof Error ? error.message : 'unknown')
    const errorCode = runtimeErrorCode(stage, error)
    await createSupabaseAdmin().from('facebook_channels').update({ last_error: errorCode, updated_at: new Date().toISOString() }).eq('id', channel.id).eq('user_id', channel.user_id)
    await finish(eventId, 'failed', errorCode)
  }
}

export async function processFacebookWebhook(payload: FacebookWebhookPayload, raw: string) {
  if (payload.object !== 'page') return
  const admin = createSupabaseAdmin()
  for (const entry of payload.entry || []) {
    if (!entry.id) continue
    const { data: channel } = await admin.from('facebook_channels').select('*').eq('page_id', entry.id).eq('status', 'connected').maybeSingle()
    if (!channel) continue
    await admin.from('facebook_channels').update({ last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', channel.id).eq('user_id', channel.user_id)
    for (const event of entry.messaging || []) await processMessage(channel as Channel, event, raw)
  }
}
