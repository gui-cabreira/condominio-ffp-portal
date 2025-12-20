import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoachRequest {
  phone: string;
  message: string;
  messageType: string;
  messageId?: string;
}

interface SessionContext {
  session: any;
  unit: any | null;
  condominium: any | null;
  coachAgent: any | null;
  lastMessages: any[];
  progress: any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Coach Agent iniciado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, message, messageType, messageId }: CoachRequest = await req.json();

    console.log(`📱 Processando mensagem de ${phone}`);
    console.log(`💬 Mensagem: ${message}`);

    // 1. Identificar condômino pelo telefone e buscar contexto
    const context = await gatherContext(supabase, phone);

    // 2. Salvar mensagem recebida
    if (context.session) {
      await saveMessage(supabase, context.session.id, {
        direction: 'inbound',
        content: message,
        messageType,
        messageId,
      });
    }

    // 3. Analisar intenção e sentimento
    const analysis = await analyzeMessage(message, context);

    console.log(`🎯 Intenção: ${analysis.intent}`);
    console.log(`😊 Sentimento: ${analysis.sentiment}`);

    // 4. Gerar resposta do coach usando IA
    const response = await generateCoachResponse(supabase, context, message, analysis);

    console.log(`💬 Resposta: ${response.text}`);

    // 5. Enviar resposta via WhatsApp
    await sendWhatsAppMessage(supabase, phone, response.text, context.session?.id);

    // 6. Salvar mensagem enviada
    if (context.session) {
      await saveMessage(supabase, context.session.id, {
        direction: 'outbound',
        content: response.text,
        messageType: 'text',
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
      });

      // 7. Atualizar sessão
      await updateSession(supabase, context.session.id, analysis);

      // 8. Registrar progresso se aplicável
      if (response.progressMetric) {
        await recordProgress(supabase, context.session.id, phone, response.progressMetric);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: context.session?.id,
        intent: analysis.intent,
        response: response.text,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no coach agent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Buscar contexto: identificar condômino pelo telefone
async function gatherContext(supabase: any, phone: string): Promise<SessionContext> {
  console.log('📚 Buscando contexto...');

  const cleanPhone = phone.replace(/\D/g, '');

  // Buscar unidade pelo telefone do proprietário ou inquilino
  let unit = null;
  let condominium = null;

  const { data: units } = await supabase
    .from('units')
    .select(`
      *,
      condominiums (
        id,
        name,
        address,
        administrator_id
      )
    `)
    .or(`owner_phone.ilike.%${cleanPhone.slice(-9)}%,tenant_phone.ilike.%${cleanPhone.slice(-9)}%`);

  if (units && units.length > 0) {
    unit = units[0];
    condominium = unit.condominiums;
  }

  // Buscar coach agent ativo para o condomínio
  let coachAgent = null;

  if (condominium) {
    const { data: agent } = await supabase
      .from('coach_agents')
      .select('*')
      .eq('active', true)
      .or(`condominium_id.eq.${condominium.id},administrator_id.eq.${condominium.administrator_id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    coachAgent = agent;
  }

  // Se não encontrou coach específico, buscar coach genérico
  if (!coachAgent) {
    const { data: genericAgent } = await supabase
      .from('coach_agents')
      .select('*')
      .eq('active', true)
      .is('condominium_id', null)
      .is('administrator_id', null)
      .limit(1)
      .single();

    coachAgent = genericAgent;
  }

  // Buscar ou criar sessão de coaching
  let { data: session } = await supabase
    .from('coaching_sessions')
    .select('*')
    .eq('phone_number', cleanPhone)
    .eq('session_status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    // Criar nova sessão
    const { data: newSession, error } = await supabase
      .from('coaching_sessions')
      .insert({
        phone_number: cleanPhone,
        unit_id: unit?.id || null,
        condominium_id: condominium?.id || null,
        coach_agent_id: coachAgent?.id || null,
        session_type: 'general',
        session_status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar sessão:', error);
    } else {
      session = newSession;
      console.log('✅ Nova sessão de coaching criada:', session.id);
    }
  }

  // Buscar últimas mensagens da sessão
  let lastMessages: any[] = [];
  if (session) {
    const { data: messages } = await supabase
      .from('coaching_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(10);

    lastMessages = messages || [];
  }

  // Buscar progresso
  let progress: any[] = [];
  if (session) {
    const { data: progressData } = await supabase
      .from('coaching_progress')
      .select('*')
      .eq('session_id', session.id)
      .order('recorded_at', { ascending: false })
      .limit(5);

    progress = progressData || [];
  }

  return {
    session,
    unit,
    condominium,
    coachAgent,
    lastMessages: lastMessages.reverse(),
    progress,
  };
}

// Analisar mensagem com IA
async function analyzeMessage(message: string, context: SessionContext) {
  console.log('🔍 Analisando mensagem...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!lovableApiKey) {
    console.warn('⚠️ LOVABLE_API_KEY não configurada, usando análise simples');
    return analyzeMessageSimple(message);
  }

  const systemPrompt = `Você é um analisador de mensagens de coaching.
Analise a mensagem e retorne APENAS um JSON neste formato:
{
  "intent": "greeting|goal_setting|progress_update|ask_question|ask_help|motivation|challenge|reflection|content_request|general",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0,
  "topics": ["lista", "de", "tópicos"],
  "urgency": "low|medium|high"
}

Tipos de intenção:
- greeting: Saudação ou início de conversa
- goal_setting: Definir ou discutir metas
- progress_update: Atualizar progresso ou conquistas
- ask_question: Fazer pergunta específica
- ask_help: Pedir ajuda ou orientação
- motivation: Buscar motivação ou encorajamento
- challenge: Relatar dificuldade ou obstáculo
- reflection: Reflexão ou autoavaliação
- content_request: Solicitar material, PDF, vídeo
- general: Conversa geral`;

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
      }),
    });

    if (!response.ok) {
      console.error('Erro na API Lovable:', response.status);
      return analyzeMessageSimple(message);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return analyzeMessageSimple(message);
  } catch (error) {
    console.error('Erro ao analisar mensagem:', error);
    return analyzeMessageSimple(message);
  }
}

// Análise simples (fallback)
function analyzeMessageSimple(message: string) {
  const msgLower = message.toLowerCase();

  let intent = 'general';
  let sentiment = 'neutral';

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hi)/i.test(msgLower)) {
    intent = 'greeting';
    sentiment = 'positive';
  } else if (/meta|objetivo|quero|vou|pretendo|planej/i.test(msgLower)) {
    intent = 'goal_setting';
  } else if (/consegui|fiz|completei|alcancei|progresso/i.test(msgLower)) {
    intent = 'progress_update';
    sentiment = 'positive';
  } else if (/\?|como|quando|qual|porque|por que/i.test(msgLower)) {
    intent = 'ask_question';
  } else if (/ajuda|ajude|preciso|socorro|não sei/i.test(msgLower)) {
    intent = 'ask_help';
  } else if (/difícil|dificil|problema|obstáculo|desafio|não consigo/i.test(msgLower)) {
    intent = 'challenge';
    sentiment = 'negative';
  } else if (/pdf|material|vídeo|video|documento|conteúdo|conteudo/i.test(msgLower)) {
    intent = 'content_request';
  } else if (/pensar|refletir|perceb|entend/i.test(msgLower)) {
    intent = 'reflection';
  }

  // Análise de sentimento simples
  if (/obrigad|ótimo|otimo|legal|bom|excelente|feliz|animad/i.test(msgLower)) {
    sentiment = 'positive';
  } else if (/triste|mal|ruim|péssimo|pessimo|frustrad|chatea/i.test(msgLower)) {
    sentiment = 'negative';
  }

  return {
    intent,
    sentiment,
    confidence: 0.7,
    topics: [],
    urgency: 'low',
  };
}

// Gerar resposta do coach com IA
async function generateCoachResponse(
  supabase: any,
  context: SessionContext,
  message: string,
  analysis: any
) {
  console.log('✍️ Gerando resposta do coach...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  // Construir contexto do usuário
  const userContext = buildUserContext(context);

  // Construir histórico de conversas
  const conversationHistory = context.lastMessages.map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content || '',
  }));

  // Personalidade do coach
  const coachPersonality = context.coachAgent?.personality || 
    'Você é um coach profissional, empático, motivador e focado em resultados. Você ajuda pessoas a alcançarem seus objetivos através de perguntas poderosas, encorajamento e orientação prática.';

  const focusAreas = context.coachAgent?.focus_areas || [];

  const systemPrompt = `${coachPersonality}

${userContext}

ANÁLISE DA MENSAGEM ATUAL:
- Intenção: ${analysis.intent}
- Sentimento: ${analysis.sentiment}
- Urgência: ${analysis.urgency}
${focusAreas.length > 0 ? `- Áreas de foco: ${focusAreas.join(', ')}` : ''}

INSTRUÇÕES:
1. Responda de forma empática e encorajadora
2. Use perguntas poderosas para estimular reflexão
3. Seja conciso (máximo 300 caracteres para WhatsApp)
4. Use emojis moderadamente para criar conexão
5. Se identificar um progresso, celebre a conquista
6. Se identificar um desafio, ofereça suporte e perspectiva
7. Sempre termine com uma pergunta ou call-to-action claro
8. NÃO use markdown, formatação especial ou asteriscos

Gere uma resposta natural e motivadora.`;

  if (!lovableApiKey) {
    return generateResponseSimple(context, analysis);
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return { text: 'Estou processando muitas mensagens agora. Pode me enviar novamente em alguns segundos? 🙏', progressMetric: null };
      }
      console.error('Erro na API Lovable:', response.status);
      return generateResponseSimple(context, analysis);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    // Determinar se deve registrar progresso
    let progressMetric = null;
    if (analysis.intent === 'progress_update') {
      progressMetric = {
        type: 'goal_progress',
        value: 1,
        data: { message },
      };
    } else if (analysis.intent === 'goal_setting') {
      progressMetric = {
        type: 'goal_set',
        value: 1,
        data: { message },
      };
    }

    return { text, progressMetric };
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    return generateResponseSimple(context, analysis);
  }
}

// Construir contexto do usuário
function buildUserContext(context: SessionContext) {
  let userContext = 'CONTEXTO DO USUÁRIO:\n';

  if (context.unit) {
    userContext += `- Unidade: ${context.unit.unit_number}`;
    if (context.unit.block) userContext += ` Bloco ${context.unit.block}`;
    userContext += '\n';
    userContext += `- Nome: ${context.unit.owner_name || context.unit.tenant_name || 'Não identificado'}\n`;
  }

  if (context.condominium) {
    userContext += `- Condomínio: ${context.condominium.name}\n`;
  }

  if (context.session) {
    userContext += `- Sessão iniciada em: ${new Date(context.session.started_at).toLocaleDateString('pt-BR')}\n`;
    
    if (context.session.goals && context.session.goals.length > 0) {
      userContext += `- Metas registradas: ${JSON.stringify(context.session.goals)}\n`;
    }
  }

  if (context.progress && context.progress.length > 0) {
    userContext += `- Últimos progressos: ${context.progress.map(p => p.metric_type).join(', ')}\n`;
  }

  return userContext;
}

// Resposta simples (fallback)
function generateResponseSimple(context: SessionContext, analysis: any) {
  const responses: Record<string, string> = {
    greeting: context.coachAgent?.welcome_message || '👋 Olá! Sou seu coach pessoal. Estou aqui para te ajudar a alcançar seus objetivos. O que você gostaria de trabalhar hoje?',
    goal_setting: '🎯 Definir metas claras é o primeiro passo! Qual é o resultado específico que você quer alcançar? E em quanto tempo?',
    progress_update: '🎉 Parabéns pelo progresso! Cada passo conta. O que você aprendeu com essa experiência?',
    ask_question: '🤔 Boa pergunta! Vou te ajudar a encontrar a resposta. Pode me dar mais detalhes sobre a situação?',
    ask_help: '💪 Estou aqui para ajudar! Qual é o maior desafio que você está enfrentando agora?',
    motivation: '✨ Você é mais capaz do que imagina! Qual foi a última vez que você superou um desafio? Como se sentiu?',
    challenge: '🌟 Desafios são oportunidades de crescimento. O que você já tentou? O que poderia fazer diferente?',
    reflection: '💭 A reflexão é poderosa! O que essa situação está te ensinando sobre você mesmo?',
    content_request: '📚 Tenho ótimos materiais para compartilhar! Qual tema específico te interessa mais agora?',
    general: '😊 Como posso te ajudar hoje? Estou aqui para apoiar sua jornada!',
  };

  return {
    text: responses[analysis.intent] || responses.general,
    progressMetric: null,
  };
}

// Salvar mensagem
async function saveMessage(supabase: any, sessionId: string, data: any) {
  await supabase
    .from('coaching_messages')
    .insert({
      session_id: sessionId,
      direction: data.direction,
      message_type: data.messageType || 'text',
      content: data.content,
      uazapi_message_id: data.messageId,
      intent: data.intent,
      sentiment: data.sentiment,
      confidence: data.confidence,
      status: data.direction === 'inbound' ? 'received' : 'sent',
    });
}

// Atualizar sessão
async function updateSession(supabase: any, sessionId: string, analysis: any) {
  await supabase
    .from('coaching_sessions')
    .update({
      last_interaction_at: new Date().toISOString(),
      session_data: {
        lastIntent: analysis.intent,
        lastSentiment: analysis.sentiment,
        updatedAt: new Date().toISOString(),
      },
    })
    .eq('id', sessionId);
}

// Registrar progresso
async function recordProgress(
  supabase: any,
  sessionId: string,
  phone: string,
  metric: any
) {
  await supabase
    .from('coaching_progress')
    .insert({
      session_id: sessionId,
      phone_number: phone.replace(/\D/g, ''),
      metric_type: metric.type,
      metric_value: metric.value,
      metric_data: metric.data,
    });
}

// Enviar mensagem via WhatsApp
async function sendWhatsAppMessage(
  supabase: any,
  phone: string,
  message: string,
  sessionId?: string
) {
  console.log('📤 Enviando mensagem via WhatsApp...');

  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        phone,
        message,
      },
    });

    if (error) {
      console.error('❌ Erro ao enviar via UAZAPI:', error);
      throw error;
    }

    console.log('✅ Mensagem enviada:', data?.messageId);
    return data;
  } catch (error) {
    console.error('❌ Erro crítico ao enviar mensagem:', error);
    return null;
  }
}
