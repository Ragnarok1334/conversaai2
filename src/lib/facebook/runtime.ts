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
import { sendFacebookText } from './client'

type MessagingEvent = {
  sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number
  message?: { mid?: string; text?: string; is_echo?: boolean }
  postback?: { mid?: string; payload?: string; title?: string }
  delivery?: { mids?: string[]; watermark?: number }
  read?: { watermark?: number }
}
export type FacebookWebhookPayload = { object?: string; entry?: Array<{ id?: string; time?: number; messaging?: MessagingEvent[] }> }
type Channel = { id: string; user_id: string; assistant_id: string; page_id: string; encrypted_page_access_token: string; config?: unknown }

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
  await createSupabaseAdmin().from('facebook_webhook_events').update({ status, error_code: code?.slice(0, 80) || null, processed_at: new Date().toISOString() }).eq('id', id)
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
    const updated = await admin.from('conversations').update({ last_message: preview.slice(0, 100), last_message_at: now, status: conversation.status === 'closed' ? 'open' : conversation.status }).eq('id', conversation.id).select('*').single()
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
        await admin.from('conversations').update({ ai_paused: true, handoff_status: 'waiting', status: 'pending', handoff_reason: 'El contacto solicitó atención humana por Messenger.', human_requested_at: new Date().toISOString() }).eq('id', conversation.id)
        const reply = config.handoffMessage || HUMAN_HANDOFF_ACK; const sent = await sendFacebookText(channel, sender, reply)
        if (sent.message_id) await admin.from('messages').insert({ conversation_id: conversation.id, user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'facebook', role: 'assistant', sender_type: 'system', content: reply, provider_message_id: sent.message_id, metadata: { delivery_status: 'accepted' } })
      }
      await finish(eventId, 'processed'); return
    }
    if (!isInsideBusinessHours(config)) {
      const sent = await sendFacebookText(channel, sender, config.awayMessage)
      if (sent.message_id) await admin.from('messages').insert({ conversation_id: conversation.id, user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'facebook', role: 'assistant', sender_type: 'system', content: config.awayMessage, provider_message_id: sent.message_id })
      await admin.from('conversations').update({ status: 'pending' }).eq('id', conversation.id); await finish(eventId, 'processed'); return
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
    try { reply = await generateAssistantReply(assistantConfig(assistant), text, getModelForPlan(plan, 'webchat_message', { messageLength: text.length }), history) }
    catch { reply = String(assistant.fallback_message || 'Tu mensaje llegó correctamente. Intenta nuevamente en unos segundos.') }
    if (config.welcomeEnabled && history.length === 0) reply = `${config.welcomeMessage}\n\n${reply}`
    stage = 'facebook_delivery'; const sent = await sendFacebookText(channel, sender, reply)
    if (sent.message_id) await admin.from('messages').insert({ conversation_id: conversation.id, user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'facebook', role: 'assistant', sender_type: 'ai', content: reply, provider_message_id: sent.message_id, metadata: { delivery_status: 'accepted' } })
    await admin.from('conversations').update({ last_message: reply.slice(0, 100), last_message_at: new Date().toISOString() }).eq('id', conversation.id)
    await finish(eventId, 'processed')
  } catch (error) {
    console.error('[Facebook message]', error instanceof Error ? error.message : 'unknown')
    await createSupabaseAdmin().from('facebook_channels').update({ last_error: stage, updated_at: new Date().toISOString() }).eq('id', channel.id)
    await finish(eventId, 'failed', stage)
  }
}

export async function processFacebookWebhook(payload: FacebookWebhookPayload, raw: string) {
  if (payload.object !== 'page') return
  const admin = createSupabaseAdmin()
  for (const entry of payload.entry || []) {
    if (!entry.id) continue
    const { data: channel } = await admin.from('facebook_channels').select('*').eq('page_id', entry.id).eq('status', 'connected').maybeSingle()
    if (!channel) continue
    await admin.from('facebook_channels').update({ last_webhook_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', channel.id)
    for (const event of entry.messaging || []) await processMessage(channel as Channel, event, raw)
  }
}
