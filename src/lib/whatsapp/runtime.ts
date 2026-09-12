import 'server-only'
import { createHash } from 'node:crypto'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { detectHumanHandoffRequest, HUMAN_HANDOFF_ACK } from '@/lib/handoff'
import { consumeMessageCredit } from '@/lib/security'
import { getEffectiveSubscriptionStatus } from '@/lib/billing/subscription-status'
import { getModelForPlan } from '@/lib/ai/model-router'
import { getPlanConfig, normalizePlan } from '@/lib/plans'
import { generateAssistantReply, type AssistantConfig } from '@/lib/openai'
import { sendWhatsAppText } from './client'

type IncomingMessage = {
  id: string
  from: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string }
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
}

type StatusUpdate = { id: string; status: string; timestamp?: string; recipient_id?: string; errors?: Array<{ code?: number }> }

export type WhatsAppWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string }
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
        messages?: IncomingMessage[]
        statuses?: StatusUpdate[]
      }
    }>
  }>
}

type WhatsAppChannelRow = {
  id: string; user_id: string; assistant_id: string; phone_number_id: string; business_account_id: string
  encrypted_access_token?: string | null
}
type AssistantRow = {
  assistant_name?: string | null; business_name?: string | null; business_type?: string | null; tone?: string | null
  main_goal?: string | null; instructions?: string | null; faqs?: string | null; services?: string | null
  schedule?: string | null; fallback_message?: string | null; language?: string | null; behavior?: unknown
  knowledge_blocks?: AssistantConfig['knowledge_blocks']; status?: string | null
}

function messageText(message: IncomingMessage): string | null {
  const value = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 4096) : null
}

function assistantConfig(assistant: AssistantRow): AssistantConfig {
  return {
    assistantName: assistant.assistant_name || '', businessName: assistant.business_name || '',
    businessType: assistant.business_type || '', channel: 'whatsapp', tone: assistant.tone || 'profesional',
    mainGoal: assistant.main_goal || '', instructions: assistant.instructions || '', faqs: assistant.faqs || '',
    services: assistant.services || '', schedule: assistant.schedule || '', fallbackMessage: assistant.fallback_message || '',
    language: assistant.language || 'es', behavior: assistant.behavior || undefined, knowledge_blocks: assistant.knowledge_blocks,
  }
}

async function recordEvent(providerEventId: string, channelId: string | null, eventType: string, rawBody: string) {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin.from('whatsapp_webhook_events').insert({
    provider_event_id: providerEventId,
    channel_id: channelId,
    event_type: eventType,
    payload_hash: createHash('sha256').update(rawBody).digest('hex'),
  }).select('id').maybeSingle()
  if (error?.code === '23505') return null
  if (error) throw error
  return data?.id as string | undefined
}

async function finishEvent(id: string | undefined, status: 'processed' | 'ignored' | 'failed', errorCode?: string) {
  if (!id) return
  await createSupabaseAdmin().from('whatsapp_webhook_events').update({
    status, processed_at: new Date().toISOString(), error_code: errorCode?.slice(0, 80) || null,
  }).eq('id', id)
}

async function processStatus(channel: WhatsAppChannelRow, status: StatusUpdate, rawBody: string) {
  const eventId = await recordEvent(`${status.id}:${status.status}:${status.timestamp || ''}`, channel.id, `status.${status.status}`, rawBody)
  if (!eventId) return
  const admin = createSupabaseAdmin()
  const { data: stored } = await admin.from('messages').select('id,metadata').eq('channel', 'whatsapp').eq('provider_message_id', status.id).maybeSingle()
  if (stored) await admin.from('messages').update({ metadata: { ...(stored.metadata || {}), delivery_status: status.status, delivery_updated_at: new Date().toISOString() } }).eq('id', stored.id)
  await finishEvent(eventId, stored ? 'processed' : 'ignored')
}

async function upsertConversationAndLead(channel: WhatsAppChannelRow, sender: string, contactName: string | null, preview: string) {
  const admin = createSupabaseAdmin()
  const now = new Date().toISOString()
  let { data: conversation } = await admin.from('conversations').select('*')
    .eq('assistant_id', channel.assistant_id).eq('channel', 'whatsapp').eq('external_chat_id', sender).maybeSingle()
  if (!conversation) {
    const result = await admin.from('conversations').insert({
      user_id: channel.user_id, assistant_id: channel.assistant_id, channel: 'whatsapp', external_chat_id: sender,
      visitor_id: `wa_${sender}`.slice(0, 100), visitor_name: contactName, visitor_phone: sender,
      status: 'open', last_message: preview.slice(0, 100), last_message_at: now,
    }).select('*').single()
    if (result.error) {
      const retry = await admin.from('conversations').select('*').eq('assistant_id', channel.assistant_id).eq('channel', 'whatsapp').eq('external_chat_id', sender).single()
      if (retry.error) throw result.error
      conversation = retry.data
    } else conversation = result.data
  } else {
    const { data } = await admin.from('conversations').update({
      visitor_name: conversation.visitor_name || contactName, visitor_phone: sender,
      last_message: preview.slice(0, 100), last_message_at: now, status: conversation.status === 'closed' ? 'open' : conversation.status,
    }).eq('id', conversation.id).select('*').single()
    if (data) conversation = data
  }

  const { data: lead } = await admin.from('leads').select('id,name,phone,email').eq('conversation_id', conversation.id).maybeSingle()
  if (!lead) {
    const { data: created } = await admin.from('leads').insert({
      user_id: channel.user_id, assistant_id: channel.assistant_id, conversation_id: conversation.id,
      name: contactName, phone: sender, source: 'whatsapp', status: 'new', metadata: { wa_id: sender },
    }).select('id').single()
    if (created) await admin.from('notifications').insert({
      user_id: channel.user_id, title: 'Nuevo lead desde WhatsApp', message: `${contactName || 'Un nuevo contacto'} inició una conversación.`,
      type: 'lead', metadata: { leadId: created.id, assistantId: channel.assistant_id, conversationId: conversation.id },
    })
  } else if (!lead.name && contactName) await admin.from('leads').update({ name: contactName }).eq('id', lead.id)
  return { conversation, lead }
}

async function storeOutbound(channel: WhatsAppChannelRow, conversationId: string, content: string, senderType: 'ai' | 'system', providerId: string) {
  await createSupabaseAdmin().from('messages').insert({
    conversation_id: conversationId, user_id: channel.user_id, assistant_id: channel.assistant_id,
    channel: 'whatsapp', role: 'assistant', sender_type: senderType, content, provider_message_id: providerId,
    metadata: { delivery_status: 'accepted' },
  })
}

async function processMessage(channel: WhatsAppChannelRow, message: IncomingMessage, contactName: string | null, rawBody: string) {
  const eventId = await recordEvent(message.id, channel.id, `message.${message.type || 'unknown'}`, rawBody)
  if (!eventId) return
  try {
    const text = messageText(message)
    if (!text) { await finishEvent(eventId, 'ignored'); return }
    const admin = createSupabaseAdmin()
    const { data: assistant } = await admin.from('assistants').select('*').eq('id', channel.assistant_id).eq('user_id', channel.user_id).maybeSingle()
    if (!assistant || assistant.status !== 'active') { await finishEvent(eventId, 'ignored', 'assistant_inactive'); return }
    const { conversation } = await upsertConversationAndLead(channel, message.from, contactName, text)
    const { error: inboundError } = await admin.from('messages').insert({
      conversation_id: conversation.id, user_id: channel.user_id, assistant_id: channel.assistant_id,
      channel: 'whatsapp', role: 'user', sender_type: 'visitor', content: text, provider_message_id: message.id,
      metadata: { whatsapp_type: message.type || 'text' },
    })
    if (inboundError?.code === '23505') { await finishEvent(eventId, 'ignored'); return }
    if (inboundError) throw inboundError

    const requestedHuman = detectHumanHandoffRequest(text)
    if (conversation.ai_paused || requestedHuman) {
      if (requestedHuman && conversation.handoff_status === 'ai') {
        const now = new Date().toISOString()
        await admin.from('conversations').update({ ai_paused: true, handoff_status: 'waiting', status: 'pending', handoff_reason: 'El contacto solicitó atención humana por WhatsApp.', human_requested_at: now }).eq('id', conversation.id)
        const sent = await sendWhatsAppText(channel, message.from, HUMAN_HANDOFF_ACK, message.id)
        if (sent.messages?.[0]?.id) await storeOutbound(channel, conversation.id, HUMAN_HANDOFF_ACK, 'system', sent.messages[0].id)
        await admin.from('notifications').insert({ user_id: channel.user_id, title: 'WhatsApp espera atención humana', message: `${contactName || 'Un contacto'} pidió hablar con una persona.`, type: 'conversation', metadata: { assistantId: channel.assistant_id, conversationId: conversation.id } })
      }
      await finishEvent(eventId, 'processed')
      return
    }

    const [{ data: subscription }, { data: profile }] = await Promise.all([
      admin.from('subscriptions').select('plan,status,current_messages_used,messages_limit,current_period_end,grace_ends_at,cancel_at_period_end').eq('user_id', channel.user_id).maybeSingle(),
      admin.from('profiles').select('trial_used,trial_ends_at').eq('id', channel.user_id).maybeSingle(),
    ])
    const effectiveStatus = getEffectiveSubscriptionStatus(subscription, profile)
    const plan = normalizePlan(subscription?.plan || 'free')
    const planConfig = getPlanConfig(plan)
    if (!['active', 'past_due'].includes(effectiveStatus) || !planConfig.channels.whatsapp) { await finishEvent(eventId, 'ignored', 'plan_inactive'); return }
    if (!await consumeMessageCredit(channel.user_id, planConfig.limits.messagesPerMonth)) { await finishEvent(eventId, 'ignored', 'limit_reached'); return }

    const [{ data: historyRows }, { data: knownLead }] = await Promise.all([
      admin.from('messages').select('role,content,created_at').eq('conversation_id', conversation.id).in('role', ['user', 'assistant']).order('created_at', { ascending: false }).limit(12),
      admin.from('leads').select('name,email,phone').eq('conversation_id', conversation.id).maybeSingle(),
    ])
    const history = (historyRows || []).slice().reverse().map(item => ({ role: item.role as 'user' | 'assistant', content: String(item.content).slice(0, 2000) }))
    // The current inbound message is already the last history item.
    if (history.at(-1)?.role === 'user' && history.at(-1)?.content === text) history.pop()
    const reply = await generateAssistantReply(assistantConfig(assistant as AssistantRow), text, getModelForPlan(plan, 'webchat_message', { messageLength: text.length }), history, {
      knownLead: { name: knownLead?.name || contactName, hasEmail: Boolean(knownLead?.email), hasPhone: true },
    })
    const sent = await sendWhatsAppText(channel, message.from, reply, message.id)
    if (sent.messages?.[0]?.id) await storeOutbound(channel, conversation.id, reply, 'ai', sent.messages[0].id)
    await admin.from('conversations').update({ last_message: reply.slice(0, 100), last_message_at: new Date().toISOString() }).eq('id', conversation.id)
    await finishEvent(eventId, 'processed')
  } catch (error) {
    console.error('[WhatsApp message]', error instanceof Error ? error.message : 'unknown')
    await finishEvent(eventId, 'failed', error instanceof Error ? error.name : 'unknown')
  }
}

export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload, rawBody: string) {
  if (payload.object !== 'whatsapp_business_account') return
  const admin = createSupabaseAdmin()
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    if (change.field !== 'messages') continue
    const value = change.value
    const phoneNumberId = value?.metadata?.phone_number_id
    if (!phoneNumberId) continue
    const { data: channel } = await admin.from('whatsapp_channels').select('*').eq('phone_number_id', phoneNumberId).eq('status', 'connected').maybeSingle()
    if (!channel) continue
    await admin.from('whatsapp_channels').update({ last_webhook_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', channel.id)
    for (const status of value.statuses || []) await processStatus(channel, status, rawBody)
    const contactName = value.contacts?.[0]?.profile?.name?.trim().slice(0, 120) || null
    for (const message of value.messages || []) await processMessage(channel, message, contactName, rawBody)
  }
}
