import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePaymentRequest {
  chargeId: string;
  methodType: 'pix' | 'boleto' | 'credit_card';
  installments?: number; // Para cartão de crédito
  discountCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chargeId, methodType, installments, discountCode }: GeneratePaymentRequest = await req.json();

    console.log(`💳 Gerando pagamento ${methodType} para cobrança ${chargeId}`);

    // Buscar cobrança
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select(`
        *,
        owners (*),
        condominiums (*),
        administrators (*)
      `)
      .eq('id', chargeId)
      .single();

    if (chargeError || !charge) {
      throw new Error('Cobrança não encontrada');
    }

    if (charge.status === 'paid') {
      throw new Error('Cobrança já foi paga');
    }

    // Buscar gateway de pagamento
    const { data: gateway } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('administrator_id', charge.administrator_id)
      .eq('active', true)
      .single();

    if (!gateway) {
      // Usar gateway padrão
      const { data: defaultGateway } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('active', true)
        .limit(1)
        .single();

      if (!defaultGateway) {
        throw new Error('Nenhum gateway de pagamento configurado');
      }
    }

    // Calcular valor final (com possível desconto)
    let finalAmount = charge.amount;
    let discountAmount = 0;

    if (discountCode) {
      const discount = await applyDiscount(supabase, chargeId, discountCode);
      if (discount) {
        discountAmount = discount.amount;
        finalAmount = charge.amount - discountAmount;
      }
    }

    // Gerar pagamento no gateway
    let paymentData;
    switch (gateway.provider) {
      case 'asaas':
        paymentData = await generateAsaasPayment(gateway, charge, methodType, finalAmount, installments);
        break;
      case 'pagarme':
        paymentData = await generatePagarMePayment(gateway, charge, methodType, finalAmount, installments);
        break;
      case 'mercadopago':
        paymentData = await generateMercadoPagoPayment(gateway, charge, methodType, finalAmount, installments);
        break;
      default:
        throw new Error(`Gateway ${gateway.provider} não suportado`);
    }

    // Salvar método de pagamento no banco
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .insert({
        charge_id: chargeId,
        gateway_id: gateway.id,
        method_type: methodType,
        amount: charge.amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        pix_qr_code: paymentData.pix?.qrCode,
        pix_qr_code_text: paymentData.pix?.qrCodeText,
        pix_expiration: paymentData.pix?.expiration,
        boleto_barcode: paymentData.boleto?.barcode,
        boleto_digitable_line: paymentData.boleto?.digitableLine,
        boleto_url: paymentData.boleto?.url,
        boleto_due_date: paymentData.boleto?.dueDate,
        card_installments: installments,
        external_id: paymentData.externalId,
        external_url: paymentData.externalUrl,
        status: 'pending',
        metadata: paymentData.metadata
      })
      .select()
      .single();

    if (pmError) {
      console.error('Erro ao salvar método de pagamento:', pmError);
      throw pmError;
    }

    // Registrar no timeline
    await supabase
      .from('charge_timeline')
      .insert({
        charge_id: chargeId,
        event_type: 'payment_generated',
        description: `Pagamento ${methodType} gerado`,
        metadata: {
          payment_method_id: paymentMethod.id,
          method_type: methodType,
          amount: finalAmount
        }
      });

    console.log(`✅ Pagamento gerado com sucesso: ${paymentMethod.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethod: paymentMethod,
        paymentData: paymentData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar pagamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Gerar pagamento via Asaas (PIX, Boleto, Cartão)
 */
async function generateAsaasPayment(
  gateway: any,
  charge: any,
  methodType: string,
  amount: number,
  installments?: number
) {
  const asaasKey = gateway.api_key_encrypted; // TODO: Descriptografar
  const asaasUrl = gateway.sandbox_mode
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://www.asaas.com/api/v3';

  // Criar cliente no Asaas se não existir
  let customerId = charge.owners.external_customer_id;

  if (!customerId) {
    const customerResponse = await fetch(`${asaasUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey
      },
      body: JSON.stringify({
        name: charge.owners.name,
        cpfCnpj: charge.owners.cpf?.replace(/\D/g, ''),
        email: charge.owners.email,
        phone: charge.owners.phone?.replace(/\D/g, ''),
        mobilePhone: charge.owners.phone?.replace(/\D/g, '')
      })
    });

    if (!customerResponse.ok) {
      throw new Error('Erro ao criar cliente no Asaas');
    }

    const customerData = await customerResponse.json();
    customerId = customerData.id;

    // TODO: Salvar external_customer_id no owner
  }

  // Criar cobrança
  const paymentPayload: any = {
    customer: customerId,
    billingType: getBillingType(methodType),
    value: amount,
    dueDate: charge.due_date,
    description: `Cobrança ${charge.condominiums?.name || ''} - ${charge.condominiums?.unit_number || ''}`,
    externalReference: charge.id,
    postalService: false
  };

  if (methodType === 'credit_card' && installments) {
    paymentPayload.installmentCount = installments;
  }

  const paymentResponse = await fetch(`${asaasUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasKey
    },
    body: JSON.stringify(paymentPayload)
  });

  if (!paymentResponse.ok) {
    const errorText = await paymentResponse.text();
    console.error('Erro Asaas:', errorText);
    throw new Error('Erro ao criar cobrança no Asaas');
  }

  const paymentData = await paymentResponse.json();

  // Gerar PIX QR Code se for PIX
  let pixData;
  if (methodType === 'pix') {
    const pixResponse = await fetch(`${asaasUrl}/payments/${paymentData.id}/pixQrCode`, {
      headers: { 'access_token': asaasKey }
    });

    if (pixResponse.ok) {
      pixData = await pixResponse.json();
    }
  }

  return {
    externalId: paymentData.id,
    externalUrl: paymentData.invoiceUrl,
    pix: pixData ? {
      qrCode: pixData.encodedImage, // Base64
      qrCodeText: pixData.payload, // Copia e cola
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    } : null,
    boleto: methodType === 'boleto' ? {
      barcode: paymentData.bankSlipUrl, // Asaas retorna URL
      digitableLine: paymentData.identificationField,
      url: paymentData.bankSlipUrl,
      dueDate: paymentData.dueDate
    } : null,
    metadata: paymentData
  };
}

function getBillingType(methodType: string): string {
  const mapping: Record<string, string> = {
    'pix': 'PIX',
    'boleto': 'BOLETO',
    'credit_card': 'CREDIT_CARD',
    'debit_card': 'DEBIT_CARD'
  };
  return mapping[methodType] || 'UNDEFINED';
}

/**
 * Gerar pagamento via PagarMe
 */
async function generatePagarMePayment(
  gateway: any,
  charge: any,
  methodType: string,
  amount: number,
  installments?: number
) {
  // TODO: Implementar integração com PagarMe
  throw new Error('PagarMe ainda não implementado');
}

/**
 * Gerar pagamento via Mercado Pago
 */
async function generateMercadoPagoPayment(
  gateway: any,
  charge: any,
  methodType: string,
  amount: number,
  installments?: number
) {
  // TODO: Implementar integração com Mercado Pago
  throw new Error('Mercado Pago ainda não implementado');
}

/**
 * Aplicar código de desconto
 */
async function applyDiscount(supabase: any, chargeId: string, code: string) {
  // TODO: Implementar lógica de cupons de desconto
  return null;
}
