import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://iugxnhdxbpzauqwkjtao.supabase.co";
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    
    if (!question) {
      throw new Error('Pergunta é obrigatória');
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey!);

    // Get statistics data
    const [defaulterStats, messageStats, condominiums, charges, messages] = await Promise.all([
      supabase.from('defaulter_statistics').select('*'),
      supabase.from('message_statistics').select('*'),
      supabase.from('condominiums').select('*'),
      supabase.from('charges').select(`
        id,
        amount,
        status,
        due_date,
        payment_date,
        reference_month,
        unit:units(
          unit_number,
          owner_name,
          condominium:condominiums(name)
        )
      `),
      supabase.from('messages').select(`
        id,
        type,
        sent_at,
        opened_at,
        responded_at,
        status,
        unit:units(
          unit_number,
          owner_name,
          condominium:condominiums(name)
        )
      `)
    ]);

    if (defaulterStats.error || messageStats.error || condominiums.error || charges.error || messages.error) {
      throw new Error('Erro ao buscar dados do banco');
    }

    // Prepare context for AI
    const context = {
      defaulter_statistics: defaulterStats.data,
      message_statistics: messageStats.data,
      condominiums: condominiums.data,
      total_charges: charges.data?.length || 0,
      total_messages: messages.data?.length || 0,
      paid_charges: charges.data?.filter(c => c.status === 'paid').length || 0,
      pending_charges: charges.data?.filter(c => c.status === 'pending').length || 0,
      overdue_charges: charges.data?.filter(c => c.status === 'overdue').length || 0,
      opened_messages: messages.data?.filter(m => m.opened_at).length || 0,
      not_opened_messages: messages.data?.filter(m => !m.opened_at).length || 0,
      responded_messages: messages.data?.filter(m => m.responded_at).length || 0,
      current_date: new Date().toISOString().split('T')[0]
    };

    console.log('Context prepared:', JSON.stringify(context, null, 2));

    // Prepare system prompt
    const systemPrompt = `Você é um assistente especializado em análise de dados de cobrança condominial da FFP Advogados.

Dados disponíveis:
- Total de condomínios: ${context.condominiums.length}
- Total de cobranças: ${context.total_charges}
- Cobranças pagas: ${context.paid_charges}
- Cobranças pendentes: ${context.pending_charges}
- Cobranças vencidas: ${context.overdue_charges}
- Total de mensagens enviadas: ${context.total_messages}
- Mensagens abertas: ${context.opened_messages}
- Mensagens não abertas: ${context.not_opened_messages}
- Mensagens respondidas: ${context.responded_messages}

Estatísticas por condomínio:
${JSON.stringify(context.defaulter_statistics, null, 2)}

Estatísticas de mensagens por condomínio:
${JSON.stringify(context.message_statistics, null, 2)}

Instruções:
1. Responda sempre em português brasileiro
2. Seja preciso com os números
3. Use formatação clara com bullet points quando necessário
4. Quando falar de valores monetários, use formato brasileiro (R$ 1.234,56)
5. Seja conciso mas informativo
6. Se não tiver dados suficientes para responder algo específico, informe isso
7. Calcule percentuais quando relevante
8. Foque na pergunta específica do usuário

Data atual: ${context.current_date}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    console.log('AI Response:', answer);

    return new Response(JSON.stringify({ 
      answer,
      context: {
        total_condominiums: context.condominiums.length,
        total_charges: context.total_charges,
        total_defaulters: context.pending_charges + context.overdue_charges,
        total_messages_not_opened: context.not_opened_messages
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in statistics-agent function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});