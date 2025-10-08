import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Processando steps agendados...')

    // Buscar steps pendentes que devem ser executados agora
    const { data: pendingSteps, error: stepsError } = await supabaseClient
      .from('workflow_execution_steps')
      .select(`
        *,
        workflow_executions!inner(
          id,
          charge_id,
          workflow_id,
          status
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50)

    if (stepsError) throw stepsError

    console.log(`Encontrados ${pendingSteps?.length || 0} steps para processar`)

    let processed = 0
    let failed = 0

    // Processar cada step
    for (const step of pendingSteps || []) {
      try {
        console.log(`Processando step ${step.id} do tipo ${step.node_type}`)

        // Buscar dados completos da cobrança
        const { data: charge, error: chargeError } = await supabaseClient
          .from('charges')
          .select(`
            *,
            units!inner(
              id,
              unit_number,
              owner_name,
              owner_email,
              owner_phone,
              owner_cpf,
              condominiums!inner(
                id,
                name
              )
            )
          `)
          .eq('id', step.workflow_executions.charge_id)
          .single()

        if (chargeError || !charge) {
          console.error('Erro ao buscar cobrança:', chargeError)
          await supabaseClient
            .from('workflow_execution_steps')
            .update({
              status: 'failed',
              error_message: 'Cobrança não encontrada',
              completed_at: new Date().toISOString()
            })
            .eq('id', step.id)
          failed++
          continue
        }

        // Processar baseado no tipo de node
        if (step.node_type === 'email') {
          // Chamar edge function de envio de email
          const emailConfig = step.result as any
          
          const { error: emailError } = await supabaseClient.functions.invoke('send-workflow-email', {
            body: {
              stepId: step.id,
              to: charge.units.owner_email,
              subject: emailConfig?.subject || 'Notificação de Cobrança',
              message: emailConfig?.message || 'Você tem uma cobrança pendente.',
              chargeData: {
                owner_name: charge.units.owner_name,
                amount: charge.amount,
                due_date: charge.due_date,
                unit_number: charge.units.unit_number,
                condominium_name: charge.units.condominiums.name
              }
            }
          })

          if (emailError) {
            console.error('Erro ao enviar email:', emailError)
            failed++
          } else {
            processed++
          }
        } else {
          // Tipos não implementados ainda (whatsapp, sms)
          console.log(`Tipo ${step.node_type} não implementado ainda`)
          await supabaseClient
            .from('workflow_execution_steps')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: { ...step.result, skipped: true, reason: 'Tipo não implementado' }
            })
            .eq('id', step.id)
          processed++
        }
      } catch (error) {
        console.error(`Erro ao processar step ${step.id}:`, error)
        failed++
      }
    }

    console.log(`Processamento completo: ${processed} sucesso, ${failed} falhas`)

    // Registrar log
    await supabaseClient
      .from('system_logs')
      .insert({
        event_type: 'scheduled_steps_processed',
        event_category: 'workflow',
        description: `Processados ${processed} steps, ${failed} falhas`,
        metadata: {
          total: pendingSteps?.length || 0,
          processed,
          failed
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        failed,
        total: pendingSteps?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro em process-scheduled-steps:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
