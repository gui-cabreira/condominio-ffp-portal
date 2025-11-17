import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const gatewayType = req.url.includes('asaas') ? 'asaas' :
                        req.url.includes('pagarme') ? 'pagarme' :
                        req.url.includes('mercadopago') ? 'mercadopago' : 'unknown';

    console.log(`📥 Webhook recebido de ${gatewayType}:`, payload.event || payload.type || 'unknown');

    // Salvar webhook no log
    const { data: webhookLog } = await supabase
      .from('payment_webhooks')
      .insert({
        gateway_id: null, // TODO: Identificar gateway pelo header ou URL
        event_type: payload.event || payload.type || 'unknown',
        external_id: payload.payment?.id || payload.data?.id || null,
        payload: payload,
        processed: false
      })
      .select()
      .single();

    // Processar webhook conforme gateway
    let result;
    switch (gatewayType) {
      case 'asaas':
        result = await processAsaasWebhook(supabase, payload, webhookLog.id);
        break;
      case 'pagarme':
        result = await processPagarMeWebhook(supabase, payload, webhookLog.id);
        break;
      case 'mercadopago':
        result = await processMercadoPagoWebhook(supabase, payload, webhookLog.id);
        break;
      default:
        throw new Error('Gateway desconhecido');
    }

    // Marcar webhook como processado
    await supabase
      .from('payment_webhooks')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', webhookLog.id);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Processar webhook do Asaas
 */
async function processAsaasWebhook(supabase: any, payload: any, webhookLogId: string) {
  const event = payload.event;
  const payment = payload.payment;

  if (!payment || !payment.externalReference) {
    console.log('⚠️ Webhook sem referência externa, ignorando');
    return { action: 'ignored' };
  }

  const chargeId = payment.externalReference;

  // Buscar método de pagamento
  const { data: paymentMethod } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('charge_id', chargeId)
    .eq('external_id', payment.id)
    .single();

  if (!paymentMethod) {
    console.log('⚠️ Método de pagamento não encontrado, criando registro...');
    // TODO: Criar registro de pagamento se não existir
    return { action: 'payment_method_not_found' };
  }

  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      return await confirmPayment(supabase, paymentMethod, payment);

    case 'PAYMENT_OVERDUE':
      return await markPaymentOverdue(supabase, paymentMethod);

    case 'PAYMENT_DELETED':
    case 'PAYMENT_RESTORED':
      return await updatePaymentStatus(supabase, paymentMethod.id, 'cancelled');

    default:
      console.log(`⚠️ Evento ${event} não tratado`);
      return { action: 'event_not_handled', event };
  }
}

/**
 * Confirmar pagamento
 */
async function confirmPayment(supabase: any, paymentMethod: any, externalPayment: any) {
  console.log(`✅ Confirmando pagamento ${paymentMethod.id}`);

  // Atualizar método de pagamento
  await supabase
    .from('payment_methods')
    .update({
      status: 'paid',
      paid_at: externalPayment.paymentDate || new Date().toISOString(),
      metadata: { ...paymentMethod.metadata, external_payment: externalPayment }
    })
    .eq('id', paymentMethod.id);

  // Criar transação
  await supabase
    .from('payment_transactions')
    .insert({
      payment_method_id: paymentMethod.id,
      charge_id: paymentMethod.charge_id,
      transaction_type: 'payment',
      status: 'completed',
      amount: externalPayment.value || paymentMethod.final_amount,
      fee_amount: externalPayment.netValue ? (externalPayment.value - externalPayment.netValue) : 0,
      net_amount: externalPayment.netValue || paymentMethod.final_amount,
      external_transaction_id: externalPayment.id,
      payment_date: externalPayment.paymentDate || new Date().toISOString(),
      settlement_date: externalPayment.estimatedCreditDate,
      payer_name: externalPayment.customer?.name,
      payer_document: externalPayment.customer?.cpfCnpj,
      raw_response: externalPayment
    });

  // Atualizar cobrança (já acontece via trigger, mas garantir)
  await supabase
    .from('charges')
    .update({
      status: 'paid',
      paid_at: externalPayment.paymentDate || new Date().toISOString()
    })
    .eq('id', paymentMethod.charge_id);

  // Enviar notificação de confirmação
  try {
    await supabase.functions.invoke('send-charge-notification', {
      body: {
        chargeId: paymentMethod.charge_id,
        channel: 'whatsapp',
        templateType: 'payment_confirmation'
      }
    });
  } catch (error) {
    console.error('Erro ao enviar notificação de confirmação:', error);
  }

  return { action: 'payment_confirmed', charge_id: paymentMethod.charge_id };
}

/**
 * Marcar pagamento como vencido
 */
async function markPaymentOverdue(supabase: any, paymentMethod: any) {
  await supabase
    .from('payment_methods')
    .update({ status: 'expired', expired_at: new Date().toISOString() })
    .eq('id', paymentMethod.id);

  return { action: 'payment_marked_overdue' };
}

/**
 * Atualizar status do pagamento
 */
async function updatePaymentStatus(supabase: any, paymentMethodId: string, status: string) {
  await supabase
    .from('payment_methods')
    .update({ status: status })
    .eq('id', paymentMethodId);

  return { action: 'status_updated', status };
}

/**
 * Processar webhook do PagarMe
 */
async function processPagarMeWebhook(supabase: any, payload: any, webhookLogId: string) {
  // TODO: Implementar processamento de webhooks do PagarMe
  console.log('⚠️ PagarMe webhook não implementado');
  return { action: 'not_implemented' };
}

/**
 * Processar webhook do Mercado Pago
 */
async function processMercadoPagoWebhook(supabase: any, payload: any, webhookLogId: string) {
  // TODO: Implementar processamento de webhooks do Mercado Pago
  console.log('⚠️ Mercado Pago webhook não implementado');
  return { action: 'not_implemented' };
}
