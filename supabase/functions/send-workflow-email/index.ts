import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { stepId, to, subject, message, chargeData } = await req.json()

    console.log('Enviando email para:', to, 'Step:', stepId)

    // Substituir variáveis na mensagem
    const processedMessage = replaceVariables(message, chargeData)
    const processedSubject = replaceVariables(subject || 'Notificação de Cobrança', chargeData)

    console.log('Mensagem processada:', processedMessage)

    // Enviar email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Notificações <notificacao@ffpadvogados.com.br>',
      to: [to],
      subject: processedSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">FFP Advogados</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            ${processedMessage.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Este é um email automático. Por favor, não responda.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Erro ao enviar email:', emailError)
      throw emailError
    }

    console.log('Email enviado com sucesso:', emailData?.id)

    // Atualizar step com sucesso
    const { error: updateError } = await supabaseClient
      .from('workflow_execution_steps')
      .update({
        status: 'completed',
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        email_id: emailData?.id,
        result: { email_id: emailData?.id, to, subject: processedSubject }
      })
      .eq('id', stepId)

    if (updateError) {
      console.error('Erro ao atualizar step:', updateError)
      throw updateError
    }

    // Registrar log
    await supabaseClient
      .from('system_logs')
      .insert({
        event_type: 'workflow_email_sent',
        event_category: 'workflow',
        description: `Email enviado para ${to} - Step ${stepId}`,
        metadata: {
          step_id: stepId,
          email_id: emailData?.id,
          to,
          subject: processedSubject
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        emailId: emailData?.id,
        stepId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro em send-workflow-email:', error)

    // Se temos stepId, atualizar com erro
    if (error.stepId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabaseClient
        .from('workflow_execution_steps')
        .update({
          status: 'failed',
          error_message: error.message,
          error_details: { error: error.message, timestamp: new Date().toISOString() },
          completed_at: new Date().toISOString()
        })
        .eq('id', error.stepId)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Função helper para substituir variáveis
function replaceVariables(text: string, data: any): string {
  if (!text || !data) return text

  let result = text

  // Substituir variáveis
  result = result.replace(/\{nome\}/g, data.owner_name || 'Proprietário')
  result = result.replace(/\{valor\}/g, formatCurrency(data.amount || 0))
  result = result.replace(/\{vencimento\}/g, formatDate(data.due_date))
  result = result.replace(/\{unidade\}/g, data.unit_number || '')
  result = result.replace(/\{condominio\}/g, data.condominium_name || '')
  
  // Calcular dias de atraso
  const daysOverdue = data.due_date ? calculateDaysOverdue(data.due_date) : 0
  result = result.replace(/\{dias_atraso\}/g, daysOverdue.toString())
  
  // Link de pagamento (futuro)
  result = result.replace(/\{link_pagamento\}/g, '#')

  return result
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function calculateDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const today = new Date()
  const diff = today.getTime() - due.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}
