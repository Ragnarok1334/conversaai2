import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversation_id, assistant_id, source, name, email, phone, notes } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    if (!email && !phone && !name) {
      return NextResponse.json({ error: 'Faltan datos de contacto para crear un lead útil' }, { status: 400 })
    }

    const { createSupabaseAdmin } = await import('@/lib/supabase/admin')
    const supabaseAdmin = createSupabaseAdmin()

    // Plan validation
    const [subRes, profileRes] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('plan, status, current_period_end, grace_ends_at, cancel_at_period_end').eq('user_id', user.id).single(),
      supabaseAdmin.from('profiles').select('trial_used, trial_ends_at').eq('id', user.id).single()
    ])
    const { getEffectiveSubscriptionStatus } = await import('@/lib/billing/subscription-status')
    const effectiveStatus = getEffectiveSubscriptionStatus(subRes.data, profileRes.data)
    
    if (['free', 'expired', 'cancelled'].includes(effectiveStatus)) {
      return NextResponse.json({ error: 'Plan inválido para crear leads' }, { status: 403 })
    }

    // Verify conversation ownership
    const { data: conv } = await supabaseAdmin.from('conversations').select('id').eq('id', conversation_id).eq('user_id', user.id).single()
    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    let existingLead = null;

    if (email || phone) {
      let query = supabaseAdmin
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('assistant_id', assistant_id)
      
      if (email && phone) {
        query = query.or(`email.eq.${email},phone.eq.${phone}`)
      } else if (email) {
        query = query.eq('email', email)
      } else if (phone) {
        query = query.eq('phone', phone)
      }

      const { data: leadsMatch } = await query.limit(1)
      if (leadsMatch && leadsMatch.length > 0) {
        existingLead = leadsMatch[0]
      }
    }

    if (existingLead) {
      // Update existing lead with new conversation or notes
      const updates: any = { conversation_id }
      if (notes) {
        updates.notes = existingLead.notes ? `${existingLead.notes}\n---\n${notes}` : notes
      }
      if (name && !existingLead.name) updates.name = name
      if (email && !existingLead.email) updates.email = email
      if (phone && !existingLead.phone) updates.phone = phone

      const { data: updatedLead, error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', existingLead.id)
        .select()
        .single()

      if (updateError) throw updateError
      return NextResponse.json({ success: true, lead: updatedLead, isNew: false })
    }

    // Insert new lead
    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          user_id: user.id,
          assistant_id,
          conversation_id,
          source: source || 'webchat',
          name,
          email,
          phone,
          notes,
          status: 'new'
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead: newLead, isNew: true })
  } catch (error: any) {
    console.error('[POST /api/leads/convert]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
