import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.text()
    const payload = JSON.parse(body)

    console.log('📬 Webhook recebido do Resend:', payload.type)

    // Verificar se é um evento relacionado a emails
    if (!payload.type || !payload.type.startsWith('email.')) {
      console.log('Evento ignorado (não é email):', payload.type)
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const eventType = payload.type
    const emailId = payload.data?.email_id
    const eventTime = payload.created_at || new Date().toISOString()

    console.log('Processando evento:', eventType, 'Email ID:', emailId)

    if (!emailId) {
      console.error('Email ID não encontrado no payload')
      return new Response(
        JSON.stringify({ error: 'Email ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === ATUALIZAR EMAIL_TRACKING (nova tabela geral) ===
    const { data: existingTracking } = await supabaseClient
      .from('email_tracking')
      .select('id, tracking_events')
      .eq('email_id', emailId)
      .single()

    // Mapear evento para coluna de timestamp
    const trackingUpdates: Record<string, any> = {}
    const eventMapping: Record<string, string> = {
      'email.sent': 'sent_at',
      'email.delivered': 'delivered_at',
      'email.opened': 'opened_at',
      'email.clicked': 'clicked_at',
      'email.bounced': 'bounced_at',
      'email.complained': 'complained_at',
      'email.unsubscribed': 'unsubscribed_at',
    }

    if (eventMapping[eventType]) {
      trackingUpdates[eventMapping[eventType]] = eventTime
    }

    if (existingTracking) {
      // Atualizar registro existente
      const currentEvents = existingTracking.tracking_events || []
      const newEvent = { type: eventType, timestamp: eventTime, data: payload.data }

      await supabaseClient
        .from('email_tracking')
        .update({
          ...trackingUpdates,
          tracking_events: [...currentEvents, newEvent],
          updated_at: eventTime
        })
        .eq('id', existingTracking.id)

      console.log('✅ Email tracking atualizado:', emailId)
    } else {
      // Criar novo registro se não existir
      await supabaseClient
        .from('email_tracking')
        .insert({
          email_id: emailId,
          recipient: payload.data.to?.[0] || '',
          subject: payload.data.subject || '',
          email_type: 'notification',
          ...trackingUpdates,
          tracking_events: [{ type: eventType, timestamp: eventTime, data: payload.data }]
        })

      console.log('✅ Novo email tracking criado:', emailId)
    }

    // === ATUALIZAR USER_INVITATIONS (se for um convite) ===
    const { data: invitation } = await supabaseClient
      .from('user_invitations')
      .select('*')
      .eq('email_id', emailId)
      .single()

    if (invitation) {
      console.log('Convite encontrado:', invitation.id)

      const updates: any = {
        tracking_events: [
          ...(invitation.tracking_events || []),
          { type: eventType, timestamp: eventTime, data: payload.data }
        ]
      }

      switch (eventType) {
        case 'email.sent':
          updates.sent_at = eventTime
          break
        case 'email.delivered':
          updates.delivered_at = eventTime
          break
        case 'email.opened':
          if (!invitation.opened_at) updates.opened_at = eventTime
          break
        case 'email.clicked':
          if (!invitation.clicked_at) updates.clicked_at = eventTime
          break
        case 'email.bounced':
          updates.bounced_at = eventTime
          break
        case 'email.complained':
          updates.complained_at = eventTime
          break
      }

      await supabaseClient
        .from('user_invitations')
        .update(updates)
        .eq('id', invitation.id)

      console.log('✅ Convite atualizado:', invitation.id)
    }

    console.log('🎉 Webhook processado com sucesso - Event:', eventType, 'Email:', emailId)

    return new Response(
      JSON.stringify({ 
        success: true,
        email_id: emailId,
        event: eventType,
        invitation_updated: !!invitation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Erro no webhook do Resend:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
