import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgentRequest {
  conversationId: string;
  phone: string;
  message: string;
  messageType: string;
}

interface ConversationContext {
  conversation: any;
  unit: any | null;
  charges: any[];
  lastMessages: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 LangGraph Agent iniciado');

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { conversationId, phone, message, messageType }: AgentRequest = await req.json();

    console.log(`📱 Processando mensagem de ${phone}`);
    console.log(`💬 Mensagem: ${message}`);

    // 1. Buscar contexto da conversa
    const context = await gatherContext(supabase, conversationId, phone);

    // 2. Identificar intenção usando IA
    const intent = await identifyIntent(message, context);

    console.log(`🎯 Intenção identificada: ${intent.type}`);

    // 3. Executar ação baseada na intenção
    let actionResult;
    switch (intent.type) {
      case 'request_boleto':
        actionResult = await handleRequestBoleto(supabase, context, intent);
        break;

      case 'request_negotiation':
        actionResult = await handleRequestNegotiation(supabase, context, intent);
        break;

      case 'confirm_payment':
        actionResult = await handleConfirmPayment(supabase, context, intent);
        break;

      case 'ask_question':
        actionResult = await handleQuestion(supabase, context, intent);
        break;

      case 'upload_proof':
        actionResult = await handleUploadProof(supabase, context, intent);
        break;

      case 'dispute':
        actionResult = await handleDispute(supabase, context, intent);
        break;

      case 'general':
      default:
        actionResult = await handleGeneral(supabase, context, intent);
        break;
    }

    // 4. Gerar resposta usando IA
    const response = await generateResponse(context, intent, actionResult);

    console.log(`💬 Resposta: ${response.text}`);

    // 5. Enviar resposta via WhatsApp
    await sendWhatsAppMessage(supabase, conversationId, phone, response.text);

    // 6. Atualizar estado da conversa
    await updateConversationState(supabase, conversationId, {
      lastIntent: intent.type,
      lastAction: actionResult.action,
      awaiting: response.awaiting || null,
    });

    // 7. Registrar interação no timeline da cobrança (se aplicável)
    if (context.charges.length > 0) {
      await logChargeTimeline(supabase, context.charges[0].id, intent, actionResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        intent: intent.type,
        response: response.text,
        action: actionResult.action,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no agent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Buscar contexto da conversa
async function gatherContext(
  supabase: any,
  conversationId: string,
  phone: string
): Promise<ConversationContext> {
  console.log('📚 Buscando contexto da conversa...');

  // Buscar conversa
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    throw new Error('Conversa não encontrada');
  }

  // Buscar últimas mensagens da conversa
  const { data: lastMessages } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Buscar unidade associada ao telefone
  let unit = null;
  let charges: any[] = [];

  // Tentar buscar unidade pelo telefone do proprietário
  const cleanPhone = phone.replace(/\D/g, '');
  const { data: units } = await supabase
    .from('units')
    .select(`
      *,
      condominiums (
        id,
        name,
        address
      )
    `)
    .or(`owner_phone.ilike.%${cleanPhone.slice(-9)}%`);

  if (units && units.length > 0) {
    unit = units[0];

    // Buscar cobranças pendentes da unidade
    const { data: pendingCharges } = await supabase
      .from('charges')
      .select('*')
      .eq('unit_id', unit.id)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5);

    charges = pendingCharges || [];
  }

  // Se tem charge_id associado na conversa
  if (conversation.charge_id) {
    const { data: charge } = await supabase
      .from('charges')
      .select(`
        *,
        units (
          *,
          condominiums (
            *
          )
        )
      `)
      .eq('id', conversation.charge_id)
      .single();

    if (charge) {
      charges = [charge, ...charges.filter(c => c.id !== charge.id)];
      if (!unit && charge.units) {
        unit = charge.units;
      }
    }
  }

  return {
    conversation,
    unit,
    charges,
    lastMessages: lastMessages || [],
  };
}

// Identificar intenção usando OpenAI
async function identifyIntent(message: string, context: ConversationContext) {
  console.log('🔍 Identificando intenção...');

  const openaiApiKey = Deno.env.get('API_OPENAI');
  if (!openaiApiKey) {
    console.warn('⚠️ OpenAI API key não configurada, usando regex simples');
    return identifyIntentSimple(message);
  }

  const systemPrompt = `Você é um assistente especializado em identificar a intenção de mensagens de condôminos inadimplentes.

Contexto do condômino:
- Unidade: ${context.unit?.unit_number || 'Não identificada'}
- Condomínio: ${context.unit?.condominiums?.name || 'Não identificado'}
- Cobranças pendentes: ${context.charges.length}
- Total devido: R$ ${context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0).toFixed(2)}

Identifique a intenção da mensagem e retorne APENAS um JSON neste formato:
{
  "type": "request_boleto|request_negotiation|confirm_payment|ask_question|upload_proof|dispute|general",
  "confidence": 0.0-1.0,
  "entities": {
    "amount": "valor mencionado se houver",
    "date": "data mencionada se houver",
    "installments": "número de parcelas se houver"
  }
}

Tipos de intenção:
- request_boleto: Solicitar novo boleto ou segunda via
- request_negotiation: Pedir parcelamento ou negociação
- confirm_payment: Informar que pagou ou vai pagar
- ask_question: Fazer pergunta sobre a cobrança
- upload_proof: Enviar comprovante de pagamento
- dispute: Contestar a cobrança
- general: Conversa geral ou saudação`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const intent = JSON.parse(data.choices[0].message.content);

    return intent;
  } catch (error) {
    console.error('Erro ao usar OpenAI, usando fallback:', error);
    return identifyIntentSimple(message);
  }
}

// Identificar intenção usando regex simples (fallback)
function identifyIntentSimple(message: string) {
  const msgLower = message.toLowerCase();

  if (/boleto|segunda via|gerar novo|enviar boleto/i.test(msgLower)) {
    return { type: 'request_boleto', confidence: 0.8, entities: {} };
  }

  if (/parcelar|parcela|negociar|acordo|desconto/i.test(msgLower)) {
    return { type: 'request_negotiation', confidence: 0.8, entities: {} };
  }

  if (/paguei|já paguei|pagamento realizado|transferência|pix/i.test(msgLower)) {
    return { type: 'confirm_payment', confidence: 0.8, entities: {} };
  }

  if (/comprovante|recibo|enviei|segue/i.test(msgLower)) {
    return { type: 'upload_proof', confidence: 0.7, entities: {} };
  }

  if (/não devo|não reconheço|contestar|errado|incorreto/i.test(msgLower)) {
    return { type: 'dispute', confidence: 0.7, entities: {} };
  }

  if (/\?|quando|quanto|qual|como/i.test(msgLower)) {
    return { type: 'ask_question', confidence: 0.6, entities: {} };
  }

  return { type: 'general', confidence: 0.5, entities: {} };
}

// Handler: Solicitar boleto
async function handleRequestBoleto(supabase: any, context: ConversationContext, intent: any) {
  console.log('📄 Gerando novo boleto...');

  if (context.charges.length === 0) {
    return {
      action: 'no_charges',
      message: 'Não encontramos cobranças pendentes para sua unidade.',
    };
  }

  const charge = context.charges[0]; // Pega a cobrança mais antiga

  // Criar solicitação de novo boleto
  const { data: boletoRequest, error } = await supabase
    .from('boleto_requests')
    .insert({
      charge_id: charge.id,
      status: 'pending',
      reason: 'Solicitado via WhatsApp',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar solicitação de boleto:', error);
    return {
      action: 'error',
      message: 'Erro ao processar solicitação de boleto.',
    };
  }

  // Registrar no timeline
  await supabase
    .from('charge_timeline')
    .insert({
      charge_id: charge.id,
      event_type: 'request_new',
      description: 'Condômino solicitou novo boleto via WhatsApp',
    });

  return {
    action: 'boleto_requested',
    charge,
    requestId: boletoRequest.id,
  };
}

// Handler: Solicitar negociação
async function handleRequestNegotiation(supabase: any, context: ConversationContext, intent: any) {
  console.log('💰 Processando solicitação de negociação...');

  if (context.charges.length === 0) {
    return {
      action: 'no_charges',
      message: 'Não encontramos cobranças pendentes para sua unidade.',
    };
  }

  const totalDebt = context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const installments = intent.entities?.installments || 3;

  // Calcular valor da parcela
  const installmentValue = totalDebt / installments;

  return {
    action: 'negotiation_proposed',
    totalDebt,
    installments,
    installmentValue,
    charges: context.charges,
  };
}

// Handler: Confirmar pagamento
async function handleConfirmPayment(supabase: any, context: ConversationContext, intent: any) {
  console.log('✅ Registrando confirmação de pagamento...');

  // Atualizar estado da conversa para aguardar comprovante
  await supabase
    .from('whatsapp_conversations')
    .update({
      status: 'waiting_proof',
      awaiting_response_type: 'proof',
    })
    .eq('id', context.conversation.id);

  return {
    action: 'waiting_proof',
  };
}

// Handler: Responder pergunta
async function handleQuestion(supabase: any, context: ConversationContext, intent: any) {
  console.log('❓ Processando pergunta...');

  // Esta função pode usar RAG (Retrieval Augmented Generation) no futuro
  // Por ora, retorna informações básicas

  return {
    action: 'question_answered',
    chargesInfo: context.charges.map(c => ({
      amount: c.amount,
      dueDate: c.due_date,
      referenceMonth: c.reference_month,
    })),
  };
}

// Handler: Upload de comprovante
async function handleUploadProof(supabase: any, context: ConversationContext, intent: any) {
  console.log('📎 Processando comprovante de pagamento...');

  // O comprovante já foi salvo pelo webhook
  // Aqui apenas confirmamos o recebimento

  return {
    action: 'proof_received',
  };
}

// Handler: Contestação
async function handleDispute(supabase: any, context: ConversationContext, intent: any) {
  console.log('⚠️ Processando contestação...');

  if (context.charges.length > 0) {
    // Registrar contestação no timeline
    await supabase
      .from('charge_timeline')
      .insert({
        charge_id: context.charges[0].id,
        event_type: 'disputed',
        description: 'Condômino contestou a cobrança via WhatsApp',
      });

    // Criar registro de bug/issue para análise manual
    await supabase
      .from('system_logs')
      .insert({
        event_type: 'charge_dispute',
        event_category: 'workflow',
        description: `Contestação de cobrança via WhatsApp - Charge ID: ${context.charges[0].id}`,
        metadata: {
          charge_id: context.charges[0].id,
          conversation_id: context.conversation.id,
          phone: context.conversation.phone_number,
        },
      });
  }

  return {
    action: 'dispute_registered',
    escalated: true,
  };
}

// Handler: Conversa geral
async function handleGeneral(supabase: any, context: ConversationContext, intent: any) {
  console.log('💬 Conversa geral...');

  return {
    action: 'general_response',
  };
}

// Gerar resposta usando IA
async function generateResponse(
  context: ConversationContext,
  intent: any,
  actionResult: any
) {
  console.log('✍️ Gerando resposta...');

  const openaiApiKey = Deno.env.get('API_OPENAI');

  if (!openaiApiKey) {
    // Fallback: respostas pré-definidas
    return generateResponseSimple(context, intent, actionResult);
  }

  const systemPrompt = `Você é um assistente virtual do condomínio ${context.unit?.condominiums?.name || '[Nome do Condomínio]'}.
Sua função é ajudar condôminos com suas dívidas de forma educada, profissional e empática.

Informações do condômino:
- Unidade: ${context.unit?.unit_number || 'Não identificada'}
- Total de cobranças pendentes: ${context.charges.length}
- Valor total devido: R$ ${context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0).toFixed(2)}

Gere uma resposta curta (máximo 200 caracteres) e direta para o WhatsApp.
Use emojis quando apropriado para deixar a conversa mais amigável.
Nunca use markdown ou formatação especial.`;

  let userPrompt = '';

  switch (actionResult.action) {
    case 'boleto_requested':
      userPrompt = `O condômino solicitou um novo boleto. A solicitação foi registrada. Informe que em breve receberá o boleto.`;
      break;

    case 'negotiation_proposed':
      userPrompt = `Propor parcelamento de R$ ${actionResult.totalDebt.toFixed(2)} em ${actionResult.installments}x de R$ ${actionResult.installmentValue.toFixed(2)}`;
      break;

    case 'waiting_proof':
      userPrompt = `O condômino informou que pagou. Pedir que envie o comprovante de pagamento.`;
      break;

    case 'question_answered':
      userPrompt = `Informar as cobranças pendentes: ${JSON.stringify(actionResult.chargesInfo)}`;
      break;

    case 'proof_received':
      userPrompt = `Confirmar recebimento do comprovante e informar que será analisado em breve.`;
      break;

    case 'dispute_registered':
      userPrompt = `A contestação foi registrada. Informar que o caso será analisado pela administração e retornaremos em breve.`;
      break;

    case 'no_charges':
      userPrompt = `Não há cobranças pendentes para esta unidade.`;
      break;

    default:
      userPrompt = `Saudar o condômino e perguntar como pode ajudar.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    const text = data.choices[0].message.content;

    return {
      text,
      awaiting: actionResult.action === 'waiting_proof' ? 'proof' : null,
    };
  } catch (error) {
    console.error('Erro ao gerar resposta, usando fallback:', error);
    return generateResponseSimple(context, intent, actionResult);
  }
}

// Gerar resposta simples (fallback)
function generateResponseSimple(context: ConversationContext, intent: any, actionResult: any) {
  const responses: any = {
    boleto_requested: '📄 Sua solicitação de boleto foi registrada! Você receberá um novo boleto em breve.',
    negotiation_proposed: `💰 Podemos parcelar sua dívida de R$ ${actionResult.totalDebt?.toFixed(2)} em ${actionResult.installments}x de R$ ${actionResult.installmentValue?.toFixed(2)}. Aceita?`,
    waiting_proof: '✅ Ótimo! Por favor, envie o comprovante de pagamento para confirmarmos.',
    proof_received: '📎 Comprovante recebido! Vamos analisar e confirmar seu pagamento em breve.',
    dispute_registered: '⚠️ Sua contestação foi registrada. Nossa equipe analisará e retornará em breve.',
    no_charges: '✅ Parabéns! Não encontramos cobranças pendentes para sua unidade.',
    general_response: '👋 Olá! Como posso ajudar? Você pode solicitar boleto, parcelar dívidas ou tirar dúvidas.',
  };

  return {
    text: responses[actionResult.action] || responses.general_response,
    awaiting: actionResult.action === 'waiting_proof' ? 'proof' : null,
  };
}

// Enviar mensagem via WhatsApp (UAZAPI)
async function sendWhatsAppMessage(
  supabase: any,
  conversationId: string,
  phone: string,
  message: string
) {
  console.log('📤 Enviando mensagem via WhatsApp...');

  // Salvar mensagem de saída no banco
  await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      sender_phone: 'system',
      recipient_phone: phone,
      message_type: 'text',
      content: message,
      status: 'sent',
    });

  // TODO: Integrar com UAZAPI para enviar mensagem de fato
  // Por ora, apenas salvamos no banco
  console.log('✅ Mensagem salva no banco (integração UAZAPI pendente)');
}

// Atualizar estado da conversa
async function updateConversationState(
  supabase: any,
  conversationId: string,
  state: any
) {
  await supabase
    .from('whatsapp_conversations')
    .update({
      conversation_state: state,
      last_message_at: new Date().toISOString(),
      last_message_from: 'bot',
    })
    .eq('id', conversationId);
}

// Registrar no timeline da cobrança
async function logChargeTimeline(
  supabase: any,
  chargeId: string,
  intent: any,
  actionResult: any
) {
  const eventTypes: any = {
    request_boleto: 'request_new',
    confirm_payment: 'payment_claimed',
    upload_proof: 'proof_uploaded',
    dispute: 'disputed',
  };

  const eventType = eventTypes[intent.type];
  if (!eventType) return;

  await supabase
    .from('charge_timeline')
    .insert({
      charge_id: chargeId,
      event_type: eventType,
      description: `${intent.type} via WhatsApp - ${actionResult.action}`,
      metadata: { intent, actionResult },
    });
}
