import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';

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

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });

    const { messageId, ownerId, recalculateScore } = await req.json();

    let results: any = {};

    // 1. Analisar sentimento de mensagem específica
    if (messageId) {
      results.sentiment = await analyzeSentiment(supabase, openai, messageId);
    }

    // 2. Gerar insights para um proprietário
    if (ownerId) {
      results.insights = await generateInsights(supabase, openai, ownerId);
      results.patterns = await detectBehaviorPatterns(supabase, ownerId);
    }

    // 3. Recalcular score
    if (ownerId && recalculateScore) {
      results.score = await recalculateOwnerScore(supabase, ownerId);
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Analisa sentimento de uma mensagem
 */
async function analyzeSentiment(supabase: any, openai: OpenAI, messageId: string) {
  console.log(`🎭 Analisando sentimento da mensagem ${messageId}`);

  // Buscar mensagem
  const { data: message } = await supabase
    .from('whatsapp_messages')
    .select(`
      *,
      conversation:whatsapp_conversations (
        owner_id,
        owners (name)
      )
    `)
    .eq('id', messageId)
    .single();

  if (!message || message.is_from_me) {
    return null; // Não analisar mensagens enviadas por nós
  }

  const text = message.body || '';

  // Usar GPT-4 para análise de sentimento
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em análise de sentimento e intenção em conversas de cobrança.
Analise a mensagem do devedor e retorne um JSON com:
- sentiment: "very_positive", "positive", "neutral", "negative", ou "very_negative"
- sentiment_score: número de -1.0 (muito negativo) a +1.0 (muito positivo)
- confidence: confiança na análise (0-100)
- intent: intenção principal ("complaint", "payment_promise", "negotiation_request", "information_request", "dispute", "excuse", "confirmation", "other")
- intent_confidence: confiança na intenção (0-100)
- emotions: objeto com emoções detectadas {"anger": 0-1, "joy": 0-1, "sadness": 0-1, "fear": 0-1, "surprise": 0-1}
- keywords: array de palavras-chave relevantes
- contains_payment_promise: boolean
- contains_negotiation_request: boolean
- contains_complaint: boolean
- contains_dispute: boolean
- urgency_level: "low", "medium", "high", ou "critical"

Retorne APENAS o JSON, sem markdown.`
      },
      {
        role: 'user',
        content: `Mensagem: "${text}"`
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');

  // Salvar análise
  const { data: sentiment } = await supabase
    .from('conversation_sentiments')
    .insert({
      conversation_id: message.conversation_id,
      message_id: messageId,
      owner_id: message.conversation.owner_id,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentiment_score,
      confidence: analysis.confidence,
      intent: analysis.intent,
      intent_confidence: analysis.intent_confidence,
      emotions: analysis.emotions,
      keywords: analysis.keywords,
      contains_payment_promise: analysis.contains_payment_promise,
      contains_negotiation_request: analysis.contains_negotiation_request,
      contains_complaint: analysis.contains_complaint,
      contains_dispute: analysis.contains_dispute,
      urgency_level: analysis.urgency_level,
      analyzed_text: text,
      ai_model: 'gpt-4o-mini'
    })
    .select()
    .single();

  // Se detectou promessa de pagamento, criar registro
  if (analysis.contains_payment_promise) {
    await detectPaymentPromise(supabase, openai, message, text);
  }

  return sentiment;
}

/**
 * Detecta promessa de pagamento na mensagem
 */
async function detectPaymentPromise(supabase: any, openai: OpenAI, message: any, text: string) {
  console.log('💰 Detectando promessa de pagamento...');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extraia informações de promessa de pagamento da mensagem.
Retorne JSON com:
- has_promise: boolean
- promised_amount: número (null se não especificado)
- promised_date: "YYYY-MM-DD" (null se não especificado, tente inferir datas relativas como "amanhã", "próxima sexta")
- confidence: 0-100

Hoje é ${new Date().toISOString().split('T')[0]}.
Retorne APENAS JSON, sem markdown.`
      },
      {
        role: 'user',
        content: `Mensagem: "${text}"`
      }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const promise = JSON.parse(completion.choices[0].message.content || '{}');

  if (promise.has_promise && promise.promised_date && promise.confidence > 60) {
    // Buscar cobrança ativa do owner
    const { data: charge } = await supabase
      .from('charges')
      .select('*')
      .eq('owner_id', message.conversation.owner_id)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1)
      .single();

    if (charge) {
      await supabase
        .from('payment_promises')
        .insert({
          owner_id: message.conversation.owner_id,
          charge_id: charge.id,
          conversation_id: message.conversation_id,
          message_id: message.id,
          promised_amount: promise.promised_amount || charge.amount,
          promised_date: promise.promised_date,
          detected_by: 'ai',
          confidence: promise.confidence
        });

      console.log(`✅ Promessa de pagamento registrada para ${promise.promised_date}`);
    }
  }
}

/**
 * Gera insights de IA para um proprietário
 */
async function generateInsights(supabase: any, openai: OpenAI, ownerId: string) {
  console.log(`🔍 Gerando insights para proprietário ${ownerId}`);

  // Buscar dados do proprietário
  const { data: owner } = await supabase
    .from('owners')
    .select(`
      *,
      charges (*),
      debtor_scores (*),
      whatsapp_conversations (
        *,
        whatsapp_messages (*)
      ),
      payment_promises (*),
      behavior_patterns (*)
    `)
    .eq('id', ownerId)
    .single();

  if (!owner) return null;

  // Preparar resumo para o GPT
  const summary = {
    total_charges: owner.charges?.length || 0,
    overdue_charges: owner.charges?.filter((c: any) => c.status === 'overdue').length || 0,
    total_debt: owner.charges?.filter((c: any) => c.status === 'overdue')
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0,
    last_payment: owner.charges?.find((c: any) => c.status === 'paid')?.paid_at || null,
    response_rate: owner.debtor_scores?.[0]?.response_rate || 0,
    payment_probability: owner.debtor_scores?.[0]?.payment_probability || 50,
    broken_promises: owner.payment_promises?.filter((p: any) => p.status === 'broken').length || 0,
    recent_sentiments: await getRecentSentiments(supabase, ownerId),
    patterns: owner.behavior_patterns?.map((p: any) => p.pattern_type) || []
  };

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em recuperação de crédito e análise de devedores.
Com base nos dados do devedor, gere insights acionáveis.

Retorne um array JSON de insights, cada um com:
- insight_type: "high_payment_risk", "likely_to_negotiate", "best_time_to_contact", "recommended_discount", "escalation_recommended", "payment_pattern_detected", "engagement_dropping"
- title: título curto do insight
- description: descrição detalhada
- priority: "low", "medium", "high", "critical"
- recommended_action: ação recomendada
- confidence: 0-100

Retorne APENAS o array JSON, sem markdown.`
      },
      {
        role: 'user',
        content: `Dados do devedor: ${JSON.stringify(summary, null, 2)}`
      }
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content || '{"insights":[]}');
  const insights = result.insights || [];

  // Salvar insights
  const savedInsights = [];
  for (const insight of insights) {
    const { data } = await supabase
      .from('ai_insights')
      .insert({
        owner_id: ownerId,
        insight_type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        priority: insight.priority,
        recommended_action: insight.recommended_action,
        confidence: insight.confidence,
        ai_model: 'gpt-4o',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      })
      .select()
      .single();

    savedInsights.push(data);
  }

  return savedInsights;
}

/**
 * Detecta padrões de comportamento
 */
async function detectBehaviorPatterns(supabase: any, ownerId: string) {
  console.log(`🔎 Detectando padrões de comportamento para ${ownerId}`);

  // Buscar histórico de cobranças
  const { data: charges } = await supabase
    .from('charges')
    .select('*')
    .eq('owner_id', ownerId)
    .order('due_date', { ascending: false });

  if (!charges || charges.length < 3) {
    return []; // Precisa de histórico mínimo
  }

  const patterns = [];

  // 1. Paga após lembrete?
  const paidCharges = charges.filter((c: any) => c.status === 'paid');
  if (paidCharges.length > 0) {
    const avgDaysLate = paidCharges.reduce((sum: number, c: any) => {
      const dueDate = new Date(c.due_date);
      const paidDate = new Date(c.paid_at);
      const days = Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0) / paidCharges.length;

    if (avgDaysLate > 0 && avgDaysLate < 15) {
      patterns.push({
        pattern_type: 'pays_after_reminder',
        pattern_name: 'Paga após lembrete',
        pattern_description: `Costuma pagar em média ${avgDaysLate.toFixed(0)} dias após vencimento`,
        confidence: 85,
        occurrences: paidCharges.length
      });
    }

    if (avgDaysLate <= 2) {
      patterns.push({
        pattern_type: 'pays_on_time',
        pattern_name: 'Pagador pontual',
        pattern_description: 'Paga geralmente dentro do prazo ou com poucos dias de atraso',
        confidence: 90,
        occurrences: paidCharges.length
      });
    }
  }

  // 2. Verifica promessas quebradas
  const { data: promises } = await supabase
    .from('payment_promises')
    .select('*')
    .eq('owner_id', ownerId);

  if (promises && promises.length > 0) {
    const brokenPromises = promises.filter((p: any) => p.status === 'broken').length;
    if (brokenPromises > 2) {
      patterns.push({
        pattern_type: 'makes_broken_promises',
        pattern_name: 'Quebra promessas frequentemente',
        pattern_description: `Já quebrou ${brokenPromises} promessas de pagamento`,
        confidence: 95,
        occurrences: brokenPromises
      });
    }
  }

  // 3. Verifica responsividade
  const { data: score } = await supabase
    .from('debtor_scores')
    .select('*')
    .eq('owner_id', ownerId)
    .single();

  if (score) {
    if (score.response_rate > 70) {
      patterns.push({
        pattern_type: 'responds_quickly',
        pattern_name: 'Responde rapidamente',
        pattern_description: `Taxa de resposta de ${score.response_rate}%`,
        confidence: 80,
        occurrences: score.messages_received_from
      });
    } else if (score.response_rate < 30) {
      patterns.push({
        pattern_type: 'ignores_messages',
        pattern_name: 'Ignora mensagens',
        pattern_description: `Taxa de resposta baixa (${score.response_rate}%)`,
        confidence: 85,
        occurrences: score.messages_sent_to
      });
    }
  }

  // Salvar padrões
  for (const pattern of patterns) {
    await supabase
      .from('behavior_patterns')
      .upsert({
        owner_id: ownerId,
        ...pattern,
        first_observed_at: new Date().toISOString(),
        last_observed_at: new Date().toISOString()
      }, { onConflict: 'owner_id,pattern_type' });
  }

  return patterns;
}

/**
 * Recalcular score do proprietário
 */
async function recalculateOwnerScore(supabase: any, ownerId: string) {
  const { data, error } = await supabase.rpc('calculate_debtor_score', {
    p_owner_id: ownerId
  });

  if (error) {
    console.error('Erro ao calcular score:', error);
    return null;
  }

  return data;
}

/**
 * Buscar sentimentos recentes
 */
async function getRecentSentiments(supabase: any, ownerId: string) {
  const { data } = await supabase
    .from('conversation_sentiments')
    .select('sentiment, sentiment_score, intent')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}
