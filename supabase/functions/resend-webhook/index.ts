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

    console.log('Webhook recebido do Resend:', payload.type)

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

    // Buscar convite pelo email_id
    const { data: invitation, error: fetchError } = await supabaseClient
      .from('user_invitations')
      .select('*')
      .eq('email_id', emailId)
      .single()

    if (fetchError || !invitation) {
      console.log('Convite não encontrado para email_id:', emailId)
      // Não retornar erro, pode ser email de outro sistema
      return new Response(
        JSON.stringify({ message: 'Invitation not found, ignoring event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Convite encontrado:', invitation.id)

    // Preparar atualização baseada no tipo de evento
    const updates: any = {
      tracking_events: [
        ...(invitation.tracking_events || []),
        {
          type: eventType,
          timestamp: eventTime,
          data: payload.data
        }
      ]
    }

    // Atualizar timestamps específicos
    switch (eventType) {
      case 'email.sent':
        updates.sent_at = eventTime
        break
      case 'email.delivered':
        updates.delivered_at = eventTime
        break
      case 'email.opened':
        if (!invitation.opened_at) { // Só registra primeira abertura
          updates.opened_at = eventTime
        }
        break
      case 'email.clicked':
        if (!invitation.clicked_at) { // Só registra primeiro clique
          updates.clicked_at = eventTime
        }
        break
      case 'email.bounced':
        updates.bounced_at = eventTime
        break
      case 'email.complained':
        updates.complained_at = eventTime
        break
    }

    // Atualizar convite
    const { error: updateError } = await supabaseClient
      .from('user_invitations')
      .update(updates)
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Erro ao atualizar convite:', updateError)
      throw updateError
    }

    console.log('Convite atualizado com sucesso:', invitation.id, 'Evento:', eventType)

    // Registrar log no sistema
    await supabaseClient
      .from('system_logs')
      .insert({
        event_type: `resend_${eventType.replace('email.', '')}`,
        event_category: 'webhook',
        description: `Webhook Resend: ${eventType} para ${invitation.email}`,
        metadata: {
          invitation_id: invitation.id,
          email_id: emailId,
          event_type: eventType,
          event_data: payload.data
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        invitation_id: invitation.id,
        event: eventType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro no webhook do Resend:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
