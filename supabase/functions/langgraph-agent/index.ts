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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 LangGraph Agent iniciado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, phone, message, messageType }: AgentRequest = await req.json();

    console.log(`📱 Processando mensagem de ${phone}`);
    console.log(`💬 Mensagem: ${message}`);

    // 1. Buscar contexto da conversa
    const context = await gatherContext(supabase, conversationId, phone);

    // Check if this is a SYSTEM_ACTION (triggered by operator buttons)
    const systemActionMatch = message.match(/^\[SYSTEM_ACTION:(\w+)\]$/);
    if (systemActionMatch) {
      const actionType = systemActionMatch[1];
      console.log(`⚡ System action detected: ${actionType}`);
      const result = await handleSystemAction(supabase, context, actionType, conversationId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Identificar intenção usando Lovable AI com scoring e pipeline
    const intent = await identifyIntentWithScoring(message, context);

    console.log(`🎯 Intenção identificada: ${intent.type} (score: ${intent.recovery_score})`);

    // 3. Log intent to coaching_intents
    const previousStage = context.charges[0]?.pipeline_stage || 'novo';
    
    // 4. Auto-move pipeline based on intent
    const newStage = determineNewPipelineStage(intent, previousStage);
    
    if (newStage !== previousStage && context.charges.length > 0) {
      await supabase
        .from('charges')
        .update({ 
          pipeline_stage: newStage,
          ai_intent: intent.type,
          ai_intent_confidence: intent.confidence,
          ai_recovery_score: intent.recovery_score,
          intended_payment_date: intent.entities?.payment_date || null,
          last_intent_at: new Date().toISOString(),
        })
        .eq('id', context.charges[0].id);
      
      console.log(`📊 Pipeline movido: ${previousStage} → ${newStage}`);
    } else if (context.charges.length > 0) {
      // Update AI fields even without stage change
      await supabase
        .from('charges')
        .update({
          ai_intent: intent.type,
          ai_intent_confidence: intent.confidence,
          ai_recovery_score: intent.recovery_score,
          intended_payment_date: intent.entities?.payment_date || null,
          last_intent_at: new Date().toISOString(),
        })
        .eq('id', context.charges[0].id);
    }

    // Update conversation AI fields
    await supabase
      .from('whatsapp_conversations')
      .update({
        ai_intent: intent.type,
        ai_intent_confidence: intent.confidence,
        ai_recovery_score: intent.recovery_score,
        intended_payment_date: intent.entities?.payment_date || null,
      })
      .eq('id', conversationId);

    // Log to coaching_intents
    await supabase
      .from('coaching_intents')
      .insert({
        conversation_id: conversationId,
        phone_number: phone,
        intent_type: intent.type,
        confidence: intent.confidence,
        entities: intent.entities || {},
        message_content: message.substring(0, 500),
        action_taken: null, // will be updated below
        pipeline_stage_before: previousStage,
        pipeline_stage_after: newStage,
      });

    // 5. Executar ação baseada na intenção
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
      case 'payment_intent':
        actionResult = await handlePaymentIntent(supabase, context, intent);
        break;
      case 'ask_question':
        actionResult = await handleQuestion(supabase, context, intent);
        break;
      case 'upload_proof':
        actionResult = await handleUploadProof(supabase, context, intent, conversationId);
        break;
      case 'dispute':
        actionResult = await handleDispute(supabase, context, intent);
        break;
      case 'request_human':
        actionResult = await handleRequestHuman(supabase, context, intent);
        break;
      case 'general':
      default:
        actionResult = await handleGeneral(supabase, context, intent);
        break;
    }

    // 6. Gerar resposta usando Lovable AI
    const response = await generateResponse(context, intent, actionResult);

    console.log(`💬 Resposta: ${response.text}`);

    // 7. Enviar resposta via WhatsApp
    await sendWhatsAppMessage(supabase, conversationId, phone, response.text);

    // 8. Atualizar estado da conversa
    await updateConversationState(supabase, conversationId, {
      lastIntent: intent.type,
      lastAction: actionResult.action,
      awaiting: response.awaiting || null,
      recoveryScore: intent.recovery_score,
    });

    // 9. Registrar interação no timeline da cobrança
    if (context.charges.length > 0) {
      await logChargeTimeline(supabase, context.charges[0].id, intent, actionResult, newStage);
    }

    return new Response(
      JSON.stringify({
        success: true,
        intent: intent.type,
        response: response.text,
        action: actionResult.action,
        pipelineStage: newStage,
        recoveryScore: intent.recovery_score,
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

// Determine new pipeline stage based on intent
function determineNewPipelineStage(intent: any, currentStage: string): string {
  const stageMap: Record<string, string> = {
    'request_boleto': 'contato_realizado',
    'request_negotiation': 'negociando',
    'confirm_payment': 'pagamento_confirmado',
    'payment_intent': 'negociando',
    'upload_proof': 'comprovante_recebido',
    'dispute': 'contestado',
    'request_human': 'escalado',
  };

  const newStage = stageMap[intent.type];
  if (!newStage) return currentStage;

  // Don't go backwards in pipeline (ordered stages)
  const stageOrder = [
    'novo', 'contato_realizado', 'negociando', 'pagamento_confirmado',
    'comprovante_recebido', 'pago', 'contestado', 'escalado'
  ];
  
  const currentIdx = stageOrder.indexOf(currentStage);
  const newIdx = stageOrder.indexOf(newStage);
  
  // Allow moving forward, or to special stages (contestado, escalado)
  if (newIdx > currentIdx || ['contestado', 'escalado'].includes(newStage)) {
    return newStage;
  }
  
  return currentStage;
}

// Handle SYSTEM_ACTION commands from operator buttons
async function handleSystemAction(
  supabase: any,
  context: ConversationContext,
  actionType: string,
  conversationId: string
) {
  console.log(`⚡ Handling system action: ${actionType}`);

  switch (actionType) {
    case 'calculate_fees': {
      if (context.charges.length === 0) {
        return { success: true, action: 'calculate_fees', result: { error: 'Nenhuma cobrança pendente encontrada.' } };
      }
      const charge = context.charges[0];
      const today = new Date();
      const dueDate = new Date(charge.due_date);
      const daysLate = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const principal = parseFloat(charge.amount);
      const fineRate = parseFloat(charge.fees_rate || 2) / 100;
      const interestRate = parseFloat(charge.interest_rate || 1) / 100;
      const fineAmount = daysLate > 0 ? principal * fineRate : 0;
      const monthsLate = Math.max(1, Math.ceil(daysLate / 30));
      const interestAmount = daysLate > 0 ? principal * interestRate * monthsLate : 0;
      const totalAmount = principal + fineAmount + interestAmount;

      // Update charge with calculated fees
      await supabase
        .from('charges')
        .update({
          fine_amount: fineAmount,
          interest_amount: interestAmount,
          total_with_fees: totalAmount,
        })
        .eq('id', charge.id);

      return {
        success: true,
        action: 'calculate_fees',
        result: {
          chargeId: charge.id,
          principal,
          daysLate,
          monthsLate,
          fineRate: fineRate * 100,
          interestRate: interestRate * 100,
          fineAmount: Number(fineAmount.toFixed(2)),
          interestAmount: Number(interestAmount.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          dueDate: charge.due_date,
          referenceMonth: charge.reference_month,
        },
      };
    }

    case 'send_boleto': {
      if (context.charges.length === 0) {
        return { success: true, action: 'send_boleto', result: { error: 'Nenhuma cobrança pendente.' } };
      }
      const charge = context.charges[0];
      // Create boleto request
      await supabase.from('boleto_requests').insert({
        charge_id: charge.id,
        conversation_id: conversationId,
        requested_by: 'operator',
        status: 'pending',
      });

      // Send notification via WhatsApp
      const totalAmount = parseFloat(charge.total_with_fees || charge.amount);
      const msg = `📄 *Cobrança - ${context.unit?.condominiums?.name || ''}*\n\n📍 Unidade: ${context.unit?.unit_number || 'N/D'}\n💰 Valor: R$ ${totalAmount.toFixed(2)}\n📅 Vencimento: ${new Date(charge.due_date).toLocaleDateString('pt-BR')}\n${charge.boleto_url ? `\n🔗 Boleto: ${charge.boleto_url}` : ''}${charge.pix_code ? `\n📱 PIX: ${charge.pix_code}` : ''}\n\nDúvidas? Estamos à disposição!`;

      await sendWhatsAppMessage(supabase, conversationId, context.conversation.phone_number, msg);

      return {
        success: true,
        action: 'send_boleto',
        result: {
          chargeId: charge.id,
          amount: totalAmount,
          sent: true,
          hasBoleto: !!charge.boleto_url,
          hasPix: !!charge.pix_code,
        },
      };
    }

    case 'propose_negotiation': {
      if (context.charges.length === 0) {
        return { success: true, action: 'propose_negotiation', result: { error: 'Nenhuma cobrança pendente.' } };
      }

      const { data: params } = await supabase.from('negotiation_parameters').select('*');
      const paramMap: Record<string, string> = {};
      params?.forEach((p: any) => { paramMap[p.parameter_key] = p.parameter_value; });

      const maxDiscount = parseFloat(paramMap['max_discount'] || '10');
      const maxInstallments = parseInt(paramMap['max_installments'] || '6');
      const totalDebt = context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
      const discountPercent = Math.min(5, maxDiscount);
      const discountedAmount = totalDebt * (1 - discountPercent / 100);

      // Send proposal via WhatsApp
      const proposalMsg = `💰 *Proposta de Negociação*\n\n📋 Débito total: R$ ${totalDebt.toFixed(2)}\n💵 Com desconto (${discountPercent}%): R$ ${discountedAmount.toFixed(2)}\n📊 Até ${maxInstallments}x de R$ ${(discountedAmount / maxInstallments).toFixed(2)}\n\nDeseja negociar? Responda *SIM* para prosseguir.`;

      await sendWhatsAppMessage(supabase, conversationId, context.conversation.phone_number, proposalMsg);

      return {
        success: true,
        action: 'propose_negotiation',
        result: {
          totalDebt: Number(totalDebt.toFixed(2)),
          discountPercent,
          discountedAmount: Number(discountedAmount.toFixed(2)),
          maxInstallments,
          installmentValue: Number((discountedAmount / maxInstallments).toFixed(2)),
          sent: true,
        },
      };
    }

    case 'request_proof': {
      const msg = `📎 Por favor, envie o comprovante de pagamento (foto ou PDF) para que possamos confirmar a quitação.\n\n🕐 Aguardando seu comprovante...`;
      await sendWhatsAppMessage(supabase, conversationId, context.conversation.phone_number, msg);

      await supabase.from('whatsapp_conversations').update({
        status: 'waiting_proof',
        awaiting_response_type: 'proof',
      }).eq('id', conversationId);

      return { success: true, action: 'request_proof', result: { sent: true } };
    }

    case 'escalate_human': {
      const result = await handleRequestHuman(supabase, context, { type: 'request_human', confidence: 1.0, entities: {} });
      const msg = `🧑 Um de nossos atendentes irá assumir esta conversa em breve. Por favor, aguarde.\n\nObrigado pela paciência! 🙏`;
      await sendWhatsAppMessage(supabase, conversationId, context.conversation.phone_number, msg);

      return { success: true, action: 'escalate_human', result: { escalated: true } };
    }

    default:
      return { success: false, action: actionType, result: { error: `Ação desconhecida: ${actionType}` } };
  }
}

// Buscar contexto da conversa
async function gatherContext(
  supabase: any,
  conversationId: string,
  phone: string
): Promise<ConversationContext> {
  console.log('📚 Buscando contexto da conversa...');

  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    throw new Error('Conversa não encontrada');
  }

  const { data: lastMessages } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);

  let unit = null;
  let charges: any[] = [];

  // Buscar unidade pelo telefone
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

    // Atualizar conversa com unit_id
    await supabase
      .from('whatsapp_conversations')
      .update({ 
        unit_id: unit.id,
        condominium_id: unit.condominium_id,
        contact_name: unit.owner_name
      })
      .eq('id', conversationId);

    const { data: pendingCharges } = await supabase
      .from('charges')
      .select('*')
      .eq('unit_id', unit.id)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5);

    charges = pendingCharges || [];
  }

  if (conversation.charge_id) {
    const { data: charge } = await supabase
      .from('charges')
      .select(`
        *,
        units (
          *,
          condominiums (*)
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

// Identify intent with recovery scoring using Lovable AI
async function identifyIntentWithScoring(message: string, context: ConversationContext) {
  console.log('🔍 Identificando intenção com scoring...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.warn('⚠️ Lovable API key não configurada, usando regex simples');
    const simpleIntent = identifyIntentSimple(message);
    return { ...simpleIntent, recovery_score: 50 };
  }

  const conversationHistory = context.lastMessages
    .reverse()
    .slice(-5)
    .map((m: any) => `[${m.direction === 'inbound' ? 'Cliente' : 'Bot'}]: ${m.content?.substring(0, 150) || '(mídia)'}`)
    .join('\n');

  const systemPrompt = `Você é um analisador de intenções de conversas de cobrança de condomínio.

Contexto do condômino:
- Unidade: ${context.unit?.unit_number || 'Não identificada'}
- Condomínio: ${context.unit?.condominiums?.name || 'Não identificado'}
- Cobranças pendentes: ${context.charges.length}
- Total devido: R$ ${context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0).toFixed(2)}
- Estágio atual: ${context.charges[0]?.pipeline_stage || 'novo'}

Histórico recente:
${conversationHistory}

Analise a mensagem e retorne APENAS um JSON:
{
  "type": "request_boleto|request_negotiation|confirm_payment|payment_intent|ask_question|upload_proof|dispute|request_human|general",
  "confidence": 0.0-1.0,
  "recovery_score": 0-100,
  "entities": {
    "amount": "valor mencionado se houver",
    "payment_date": "YYYY-MM-DD se mencionou data de pagamento",
    "installments": "número de parcelas se houver"
  }
}

Tipos:
- request_boleto: Solicitar boleto/segunda via
- request_negotiation: Pedir parcelamento/negociação
- confirm_payment: Diz que JÁ pagou
- payment_intent: Diz que VAI pagar (data futura) - "vou pagar sexta", "pago semana que vem"
- ask_question: Pergunta sobre cobrança
- upload_proof: Enviar comprovante
- dispute: Contestar cobrança
- request_human: Pedir atendente humano
- general: Conversa geral

recovery_score (0-100):
- 0-20: Contestação, recusa, hostilidade
- 20-40: Sem engajamento, respostas curtas
- 40-60: Fazendo perguntas, algum interesse
- 60-80: Negociando, pedindo boleto, mencionando pagamento
- 80-100: Confirmou pagamento, enviou comprovante, aceitou acordo`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Erro na API Lovable:', response.status);
      const simpleIntent = identifyIntentSimple(message);
      return { ...simpleIntent, recovery_score: 50 };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || 'general',
        confidence: parsed.confidence || 0.5,
        recovery_score: parsed.recovery_score || 50,
        entities: parsed.entities || {},
      };
    }
    
    const simpleIntent = identifyIntentSimple(message);
    return { ...simpleIntent, recovery_score: 50 };
  } catch (error) {
    console.error('Erro ao usar Lovable AI, usando fallback:', error);
    const simpleIntent = identifyIntentSimple(message);
    return { ...simpleIntent, recovery_score: 50 };
  }
}

// Identify intent simple (fallback)
function identifyIntentSimple(message: string) {
  const msgLower = message.toLowerCase();

  if (/boleto|segunda via|gerar novo|enviar boleto/i.test(msgLower)) {
    return { type: 'request_boleto', confidence: 0.8, entities: {} };
  }
  if (/parcelar|parcela|negociar|acordo|desconto/i.test(msgLower)) {
    return { type: 'request_negotiation', confidence: 0.8, entities: {} };
  }
  if (/paguei|já paguei|pagamento realizado|transferência|pix feito/i.test(msgLower)) {
    return { type: 'confirm_payment', confidence: 0.8, entities: {} };
  }
  if (/vou pagar|pago amanhã|pago segunda|pago sexta|pretendo pagar|vou quitar/i.test(msgLower)) {
    return { type: 'payment_intent', confidence: 0.7, entities: {} };
  }
  if (/comprovante|recibo|enviei|segue anexo/i.test(msgLower)) {
    return { type: 'upload_proof', confidence: 0.7, entities: {} };
  }
  if (/não devo|não reconheço|contestar|errado|incorreto/i.test(msgLower)) {
    return { type: 'dispute', confidence: 0.7, entities: {} };
  }
  if (/humano|atendente|pessoa|falar com alguém|falar com alguem|operador|suporte humano|transferir/i.test(msgLower)) {
    return { type: 'request_human', confidence: 0.9, entities: {} };
  }
  if (/\?|quando|quanto|qual|como/i.test(msgLower)) {
    return { type: 'ask_question', confidence: 0.6, entities: {} };
  }

  return { type: 'general', confidence: 0.5, entities: {} };
}

// Handler: Payment Intent (new - "vou pagar")
async function handlePaymentIntent(supabase: any, context: ConversationContext, intent: any) {
  console.log('📅 Registrando intenção de pagamento...');

  const paymentDate = intent.entities?.payment_date;

  // Update conversation with intent
  await supabase
    .from('whatsapp_conversations')
    .update({
      status: 'waiting',
      awaiting_response_type: 'payment_confirmation',
      intended_payment_date: paymentDate || null,
    })
    .eq('id', context.conversation.id);

  return {
    action: 'payment_intent_registered',
    paymentDate,
  };
}

// Handler: Solicitar boleto
async function handleRequestBoleto(supabase: any, context: ConversationContext, intent: any) {
  console.log('📄 Gerando novo boleto...');

  if (context.charges.length === 0) {
    return { action: 'no_charges', message: 'Não encontramos cobranças pendentes para sua unidade.' };
  }

  const charge = context.charges[0];

  const { data: boletoRequest, error } = await supabase
    .from('boleto_requests')
    .insert({
      charge_id: charge.id,
      conversation_id: context.conversation.id,
      requested_by: context.conversation.phone_number,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar solicitação de boleto:', error);
    return { action: 'error', message: 'Erro ao processar solicitação de boleto.' };
  }

  const today = new Date();
  const dueDate = new Date(charge.due_date);
  let totalAmount = parseFloat(charge.amount);
  let fineAmount = 0;
  let interestAmount = 0;

  if (today > dueDate) {
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    fineAmount = totalAmount * 0.02;
    interestAmount = totalAmount * (0.01 * (daysLate / 30));
    totalAmount = totalAmount + fineAmount + interestAmount;
  }

  return {
    action: 'boleto_requested',
    charge,
    requestId: boletoRequest.id,
    originalAmount: parseFloat(charge.amount),
    fineAmount,
    interestAmount,
    totalAmount,
    boletUrl: charge.boleto_url,
    pixCode: charge.pix_code,
  };
}

// Handler: Solicitar negociação
async function handleRequestNegotiation(supabase: any, context: ConversationContext, intent: any) {
  console.log('💰 Processando solicitação de negociação...');

  if (context.charges.length === 0) {
    return { action: 'no_charges', message: 'Não encontramos cobranças pendentes para sua unidade.' };
  }

  const { data: params } = await supabase
    .from('negotiation_parameters')
    .select('*');

  const paramMap: Record<string, string> = {};
  params?.forEach((p: any) => { paramMap[p.parameter_key] = p.parameter_value; });

  const maxDiscount = parseFloat(paramMap['max_discount'] || '10');
  const maxInstallments = parseInt(paramMap['max_installments'] || '6');

  const totalDebt = context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const installments = Math.min(intent.entities?.installments || 3, maxInstallments);
  const discountPercent = Math.min(5, maxDiscount);
  const discountedAmount = totalDebt * (1 - discountPercent / 100);
  const installmentValue = discountedAmount / installments;

  const { data: negotiation } = await supabase
    .from('negotiation_history')
    .insert({
      charge_id: context.charges[0].id,
      unit_id: context.unit?.id,
      original_amount: totalDebt,
      proposed_amount: discountedAmount,
      discount_percentage: discountPercent,
      installments: installments,
      proposed_by: 'ai_agent',
      status: 'pending',
    })
    .select()
    .single();

  return {
    action: 'negotiation_proposed',
    totalDebt,
    discountPercent,
    discountedAmount,
    installments,
    installmentValue,
    charges: context.charges,
    negotiationId: negotiation?.id,
  };
}

// Handler: Confirmar pagamento
async function handleConfirmPayment(supabase: any, context: ConversationContext, intent: any) {
  console.log('✅ Registrando confirmação de pagamento...');

  await supabase
    .from('whatsapp_conversations')
    .update({
      status: 'waiting_proof',
      awaiting_response_type: 'proof',
    })
    .eq('id', context.conversation.id);

  return { action: 'waiting_proof' };
}

// Handler: Responder pergunta
async function handleQuestion(supabase: any, context: ConversationContext, intent: any) {
  console.log('❓ Processando pergunta...');

  return {
    action: 'question_answered',
    chargesInfo: context.charges.map(c => ({
      amount: c.amount,
      dueDate: c.due_date,
      referenceMonth: c.reference_month,
      status: c.status,
    })),
    unitInfo: {
      unitNumber: context.unit?.unit_number,
      condominium: context.unit?.condominiums?.name,
      ownerName: context.unit?.owner_name,
    },
  };
}

// Handler: Upload de comprovante
async function handleUploadProof(supabase: any, context: ConversationContext, intent: any, conversationId: string) {
  console.log('📎 Processando comprovante de pagamento...');

  const { data: mediaMessages } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .in('message_type', ['image', 'document'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (mediaMessages && mediaMessages.length > 0 && context.charges.length > 0) {
    const mediaMessage = mediaMessages[0];
    
    await supabase
      .from('payment_proofs')
      .insert({
        charge_id: context.charges[0].id,
        conversation_id: conversationId,
        message_id: mediaMessage.id,
        file_url: mediaMessage.media_url,
        file_type: mediaMessage.media_mimetype,
        status: 'pending',
      });

    await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'proof_received',
        awaiting_response_type: null,
      })
      .eq('id', conversationId);
  }

  return { action: 'proof_received' };
}

// Handler: Contestação
async function handleDispute(supabase: any, context: ConversationContext, intent: any) {
  console.log('⚠️ Processando contestação...');

  if (context.charges.length > 0) {
    await supabase
      .from('charge_timeline')
      .insert({
        charge_id: context.charges[0].id,
        event_type: 'disputed',
        event_data: {
          description: 'Condômino contestou a cobrança via WhatsApp',
          phone: context.conversation.phone_number,
        },
      });
  }

  await supabase
    .from('whatsapp_conversations')
    .update({
      status: 'escalated',
      tags: [...(context.conversation.tags || []), 'contestacao', 'urgente'],
    })
    .eq('id', context.conversation.id);

  return { action: 'dispute_registered', escalated: true };
}

// Handler: Conversa geral
async function handleGeneral(supabase: any, context: ConversationContext, intent: any) {
  console.log('💬 Conversa geral...');
  return {
    action: 'general_response',
    hasCharges: context.charges.length > 0,
    totalDebt: context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
  };
}

// Handler: Solicitar atendente humano
async function handleRequestHuman(supabase: any, context: ConversationContext, intent: any) {
  console.log('🧑 Escalando para atendente humano...');

  await supabase
    .from('whatsapp_conversations')
    .update({
      status: 'escalated',
      tags: [...(context.conversation.tags || []), 'escalado_humano'],
    })
    .eq('id', context.conversation.id);

  const messagesSummary = context.lastMessages
    .reverse()
    .map((m: any) => `[${m.direction === 'inbound' ? 'Cliente' : 'Bot'}] ${m.content?.substring(0, 100) || '(mídia)'}`)
    .join('\n');

  const { data: adminUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'assistant']);

  if (adminUsers && adminUsers.length > 0) {
    const notifications = adminUsers.map((u: any) => ({
      user_id: u.user_id,
      title: '🧑 Solicitação de Atendente Humano',
      message: `O contato ${context.conversation.contact_name || context.conversation.phone_number} solicitou falar com um atendente.\n\nUnidade: ${context.unit?.unit_number || 'N/D'}\nCondomínio: ${context.unit?.condominiums?.name || 'N/D'}\n\nÚltimas mensagens:\n${messagesSummary}`,
      type: 'warning',
      category: 'whatsapp',
      action_url: '/portal/corporativo/atendimento',
      metadata: {
        conversation_id: context.conversation.id,
        phone: context.conversation.phone_number,
        contact_name: context.conversation.contact_name,
      }
    }));

    await supabase.from('notifications').insert(notifications);
  }

  if (context.charges.length > 0) {
    await supabase
      .from('charge_timeline')
      .insert({
        charge_id: context.charges[0].id,
        event_type: 'escalated_to_human',
        event_data: {
          phone: context.conversation.phone_number,
          reason: 'customer_request',
        },
      });
  }

  return { action: 'escalated_to_human', escalated: true };
}

// Gerar resposta usando Lovable AI
async function generateResponse(
  context: ConversationContext,
  intent: any,
  actionResult: any
) {
  console.log('✍️ Gerando resposta com Lovable AI...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!lovableApiKey) {
    return generateResponseSimple(context, intent, actionResult);
  }

  const systemPrompt = `Você é um assistente virtual do condomínio ${context.unit?.condominiums?.name || '[Nome do Condomínio]'}.
Sua função é ajudar condôminos com suas dívidas de forma educada, profissional e empática.

Informações do condômino:
- Unidade: ${context.unit?.unit_number || 'Não identificada'}
- Total de cobranças pendentes: ${context.charges.length}
- Valor total devido: R$ ${context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0).toFixed(2)}

Resultado da ação: ${JSON.stringify(actionResult)}

Gere uma resposta curta (máximo 300 caracteres) e direta para o WhatsApp.
Use emojis quando apropriado para deixar a conversa mais amigável.
Seja empático e ofereça ajuda.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Intenção: ${intent.type}. Gere uma resposta apropriada.` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Erro na API Lovable:', response.status);
      return generateResponseSimple(context, intent, actionResult);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    return {
      text: text.trim(),
      awaiting: actionResult.action === 'waiting_proof' ? 'proof' : null,
    };
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    return generateResponseSimple(context, intent, actionResult);
  }
}

// Gerar resposta simples (fallback)
function generateResponseSimple(
  context: ConversationContext,
  intent: any,
  actionResult: any
) {
  const condoName = context.unit?.condominiums?.name || 'seu condomínio';
  const totalDebt = context.charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  switch (actionResult.action) {
    case 'boleto_requested':
      const total = actionResult.totalAmount?.toFixed(2) || actionResult.charge?.amount;
      if (actionResult.boletUrl) {
        return {
          text: `📄 *Boleto Atualizado*\n\n💰 Valor: R$ ${total}\n📅 Vencimento: ${actionResult.charge?.due_date}\n\n🔗 Link: ${actionResult.boletUrl}\n\n📱 *PIX:*\n\`\`\`${actionResult.pixCode || 'Não disponível'}\`\`\`\n\nQualquer dúvida, estou aqui!`,
          awaiting: null,
        };
      }
      return {
        text: `📄 Recebemos sua solicitação de boleto!\n\nEstamos gerando um novo boleto no valor de R$ ${total}. Em breve você receberá o link.\n\nPrecisa de mais alguma coisa?`,
        awaiting: null,
      };

    case 'negotiation_proposed':
      return {
        text: `💰 *Proposta de Negociação*\n\n📋 Débito: R$ ${actionResult.totalDebt.toFixed(2)}\n💵 Com desconto: R$ ${actionResult.discountedAmount.toFixed(2)} (${actionResult.discountPercent}% off)\n📊 Parcelas: ${actionResult.installments}x de R$ ${actionResult.installmentValue.toFixed(2)}\n\nDeseja aceitar? Responda *SIM* ou *NÃO*.`,
        awaiting: 'negotiation_response',
      };

    case 'waiting_proof':
      return {
        text: `✅ Ótimo! Por favor, envie o comprovante de pagamento (foto ou PDF) para confirmarmos.\n\n📎 Aguardando seu comprovante...`,
        awaiting: 'proof',
      };

    case 'payment_intent_registered':
      const dateMsg = actionResult.paymentDate 
        ? `Registramos que você pretende pagar em ${actionResult.paymentDate}. ` 
        : '';
      return {
        text: `📅 ${dateMsg}Agradecemos o compromisso!\n\nAssim que realizar o pagamento, nos envie o comprovante para darmos baixa. 🙏`,
        awaiting: 'payment_confirmation',
      };

    case 'proof_received':
      return {
        text: `📎 *Comprovante Recebido!*\n\nObrigado por enviar. Estamos analisando e em breve confirmaremos a quitação.\n\n🕐 Prazo: até 24 horas úteis`,
        awaiting: null,
      };

    case 'question_answered':
      if (context.charges.length === 0) {
        return {
          text: `📊 Não encontramos cobranças pendentes para sua unidade.\n\nSe você tem alguma dúvida específica, por favor descreva e vamos ajudar!`,
          awaiting: null,
        };
      }
      const charge = context.charges[0];
      return {
        text: `📊 *Resumo da sua situação:*\n\n📍 Unidade: ${context.unit?.unit_number || 'N/D'}\n💰 Valor: R$ ${charge.amount}\n📅 Vencimento: ${charge.due_date}\n📋 Ref: ${charge.reference_month || 'N/D'}\n\nPosso gerar um novo boleto ou ajudar com negociação?`,
        awaiting: null,
      };

    case 'dispute_registered':
      return {
        text: `⚠️ Registramos sua contestação.\n\nUm atendente irá analisar o seu caso e entrar em contato em breve.\n\n📞 Se preferir, ligue para nossa central de atendimento.`,
        awaiting: null,
      };

    case 'no_charges':
      return {
        text: `✅ Boa notícia! Não encontramos cobranças pendentes em seu nome.\n\nSe você acredita que há algum erro, por favor descreva a situação.`,
        awaiting: null,
      };

    case 'escalated_to_human':
      return {
        text: `🧑 Entendido! Estou transferindo você para um de nossos atendentes.\n\n📞 Um especialista irá entrar em contato em breve com todo o histórico da nossa conversa.\n\nObrigado pela paciência! 🙏`,
        awaiting: null,
      };

    default:
      if (context.charges.length > 0) {
        return {
          text: `Olá! 👋 Sou o assistente virtual de ${condoName}.\n\nIdentifiquei ${context.charges.length} cobrança(s) pendente(s) no valor de R$ ${totalDebt.toFixed(2)}.\n\nComo posso ajudar?\n• 📄 Novo boleto\n• 💰 Negociar\n• ❓ Tirar dúvidas`,
          awaiting: null,
        };
      }
      return {
        text: `Olá! 👋 Sou o assistente virtual de ${condoName}.\n\nComo posso ajudar você hoje?`,
        awaiting: null,
      };
  }
}

// Enviar mensagem via WhatsApp
async function sendWhatsAppMessage(
  supabase: any,
  conversationId: string,
  phone: string,
  text: string
) {
  console.log('📤 Enviando mensagem via WhatsApp...');

  try {
    // send-whatsapp-message já insere em whatsapp_messages e atualiza whatsapp_conversations
    // NÃO duplicar inserções aqui
    const { error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: { phone, message: text, conversationId },
    });

    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      return;
    }

    console.log('✅ Mensagem enviada com sucesso');
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
  }
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
      metadata: state,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
}

// Registrar no timeline da cobrança
async function logChargeTimeline(
  supabase: any,
  chargeId: string,
  intent: any,
  actionResult: any,
  newStage: string
) {
  const eventTypeMap: Record<string, string> = {
    request_boleto: 'boleto_requested',
    request_negotiation: 'negotiation_started',
    confirm_payment: 'payment_confirmed',
    payment_intent: 'payment_intent_registered',
    upload_proof: 'proof_received',
    dispute: 'disputed',
    request_human: 'escalated_to_human',
  };

  const eventType = eventTypeMap[intent.type] || 'interaction';

  await supabase
    .from('charge_timeline')
    .insert({
      charge_id: chargeId,
      event_type: eventType,
      event_data: {
        intent: intent.type,
        confidence: intent.confidence,
        recovery_score: intent.recovery_score,
        action: actionResult.action,
        pipeline_stage: newStage,
        payment_date: intent.entities?.payment_date || null,
      },
    });
}
