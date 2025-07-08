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
    const { question, condominiumId } = await req.json();
    
    if (!question) {
      throw new Error('Pergunta é obrigatória');
    }

    if (!condominiumId) {
      throw new Error('ID do condomínio é obrigatório');
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey!);

    // Get specific condominium data
    const [condominiumData, unitsData, chargesData, messagesData] = await Promise.all([
      supabase
        .from('condominiums')
        .select('*')
        .eq('id', condominiumId)
        .single(),
      
      supabase
        .from('units')
        .select(`
          *,
          charges:charges(
            id,
            amount,
            status,
            due_date,
            payment_date,
            reference_month,
            description
          )
        `)
        .eq('condominium_id', condominiumId),
      
      supabase
        .from('charges')
        .select(`
          id,
          amount,
          status,
          due_date,
          payment_date,
          reference_month,
          description,
          unit:units!inner(
            id,
            unit_number,
            owner_name,
            condominium_id
          )
        `)
        .eq('unit.condominium_id', condominiumId),
      
      supabase
        .from('messages')
        .select(`
          id,
          type,
          sent_at,
          opened_at,
          responded_at,
          status,
          content,
          unit:units!inner(
            id,
            unit_number,
            owner_name,
            condominium_id
          )
        `)
        .eq('unit.condominium_id', condominiumId)
    ]);

    if (condominiumData.error) {
      throw new Error(`Condomínio não encontrado: ${condominiumData.error.message}`);
    }

    if (unitsData.error || chargesData.error || messagesData.error) {
      throw new Error('Erro ao buscar dados do condomínio');
    }

    const condominium = condominiumData.data;
    const units = unitsData.data || [];
    const charges = chargesData.data || [];
    const messages = messagesData.data || [];

    // Calculate statistics for this specific condominium
    const stats = {
      total_units: units.length,
      total_charges: charges.length,
      paid_charges: charges.filter(c => c.status === 'paid').length,
      pending_charges: charges.filter(c => c.status === 'pending').length,
      overdue_charges: charges.filter(c => c.status === 'overdue').length,
      total_pending_amount: charges
        .filter(c => c.status === 'pending' || c.status === 'overdue')
        .reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0),
      total_paid_amount: charges
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0),
      total_messages: messages.length,
      opened_messages: messages.filter(m => m.opened_at).length,
      not_opened_messages: messages.filter(m => !m.opened_at).length,
      responded_messages: messages.filter(m => m.responded_at).length,
      units_with_pending_charges: charges
        .filter(c => c.status === 'pending' || c.status === 'overdue')
        .map(c => c.unit?.unit_number)
        .filter((value, index, self) => self.indexOf(value) === index).length,
      whatsapp_messages: messages.filter(m => m.type === 'whatsapp').length,
      email_messages: messages.filter(m => m.type === 'email').length,
      sms_messages: messages.filter(m => m.type === 'sms').length
    };

    console.log('Condominium stats prepared:', JSON.stringify(stats, null, 2));

    // Create context message with specific condominium data
    const contextMessage = `Dados específicos do condomínio "${condominium.name}" (ID: ${condominiumId}):

INFORMAÇÕES BÁSICAS:
- Nome: ${condominium.name}
- Endereço: ${condominium.address || 'Não informado'}
- Total de unidades: ${stats.total_units}
- Data de criação: ${condominium.created_at}

ESTATÍSTICAS FINANCEIRAS:
- Total de cobranças: ${stats.total_charges}
- Cobranças pagas: ${stats.paid_charges}
- Cobranças pendentes: ${stats.pending_charges}
- Cobranças vencidas: ${stats.overdue_charges}
- Valor total pendente: R$ ${stats.total_pending_amount.toFixed(2)}
- Valor total arrecadado: R$ ${stats.total_paid_amount.toFixed(2)}
- Unidades com cobrança pendente: ${stats.units_with_pending_charges}

ESTATÍSTICAS DE COMUNICAÇÃO:
- Total de mensagens enviadas: ${stats.total_messages}
- Mensagens abertas: ${stats.opened_messages}
- Mensagens não abertas: ${stats.not_opened_messages}
- Mensagens respondidas: ${stats.responded_messages}
- Mensagens WhatsApp: ${stats.whatsapp_messages}
- Mensagens Email: ${stats.email_messages}
- Mensagens SMS: ${stats.sms_messages}

TAXA DE EFICIÊNCIA:
- Taxa de pagamento: ${stats.total_charges > 0 ? ((stats.paid_charges / stats.total_charges) * 100).toFixed(1) : 0}%
- Taxa de abertura de mensagens: ${stats.total_messages > 0 ? ((stats.opened_messages / stats.total_messages) * 100).toFixed(1) : 0}%
- Taxa de resposta: ${stats.total_messages > 0 ? ((stats.responded_messages / stats.total_messages) * 100).toFixed(1) : 0}%

UNIDADES DETALHADAS:
${units.map(unit => `
- ${unit.unit_number}: ${unit.owner_name || 'Proprietário não informado'}
  Cobranças: ${unit.charges?.length || 0}
  Status atual: ${unit.charges?.length > 0 ? unit.charges[unit.charges.length - 1].status : 'sem cobrança'}
`).join('')}

Data atual: ${new Date().toISOString().split('T')[0]}

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

    const messagesResponseData = await messagesResponse.json();
    const assistantMessage = messagesResponseData.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content || !assistantMessage.content[0]) {
      throw new Error('No response from assistant');
    }

    const answer = assistantMessage.content[0].text.value;

    console.log('AI Response:', answer);

    return new Response(JSON.stringify({ 
      answer,
      context: {
        condominium_name: condominium.name,
        total_units: stats.total_units,
        total_defaulters: stats.pending_charges + stats.overdue_charges,
        total_messages_not_opened: stats.not_opened_messages,
        efficiency_rate: stats.total_charges > 0 ? ((stats.paid_charges / stats.total_charges) * 100).toFixed(1) : 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in condominium-agent function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: 'Desculpe, ocorreu um erro ao processar sua pergunta sobre este condomínio. Tente novamente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});