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
const assistantId = "asst_d83J8rsxQYJbRJxzVYf5kRAL";

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

    // Create context message with all data
    const contextMessage = `Dados atualizados do sistema FFP Advogados:

RESUMO GERAL:
- Total de condomínios: ${context.condominiums.length}
- Total de cobranças: ${context.total_charges}
- Cobranças pagas: ${context.paid_charges}
- Cobranças pendentes: ${context.pending_charges}
- Cobranças vencidas: ${context.overdue_charges}
- Total de mensagens enviadas: ${context.total_messages}
- Mensagens abertas: ${context.opened_messages}
- Mensagens não abertas: ${context.not_opened_messages}
- Mensagens respondidas: ${context.responded_messages}

ESTATÍSTICAS POR CONDOMÍNIO:
${JSON.stringify(context.defaulter_statistics, null, 2)}

ESTATÍSTICAS DE MENSAGENS:
${JSON.stringify(context.message_statistics, null, 2)}

Data atual: ${context.current_date}

Pergunta do usuário: ${question}`;

    // Create a thread with OpenAI Assistants API
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: contextMessage
          }
        ]
      }),
    });

    if (!threadResponse.ok) {
      throw new Error(`Error creating thread: ${threadResponse.statusText}`);
    }

    const threadData = await threadResponse.json();
    const threadId = threadData.id;

    console.log('Thread created:', threadId);

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      throw new Error(`Error running assistant: ${runResponse.statusText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.id;

    console.log('Run started:', runId);

    // Poll for completion
    let runStatus = 'in_progress';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus === 'in_progress' || runStatus === 'queued') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Error checking run status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;

      console.log(`Run status: ${runStatus}, attempt: ${attempts}`);
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!messagesResponse.ok) {
      throw new Error(`Error getting messages: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content || !assistantMessage.content[0]) {
      throw new Error('No response from assistant');
    }

    const answer = assistantMessage.content[0].text.value;

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