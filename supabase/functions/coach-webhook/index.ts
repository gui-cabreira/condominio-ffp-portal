import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Webhook dedicado para receber mensagens do coach via UAZAPI
 * URL: https://szryusxuheimljfhsuku.supabase.co/functions/v1/coach-webhook
 * 
 * Configurar no UAZAPI:
 * - Webhook URL: (URL acima)
 * - Eventos: message.received, message.status
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Coach Webhook recebido');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Identificar tipo de evento
    const eventType = payload.event;

    switch (eventType) {
      case 'message.received':
        console.log('💬 Nova mensagem recebida');
        await handleIncomingMessage(supabase, payload);
        break;

      case 'message.status':
        console.log('✅ Status de mensagem atualizado');
        await handleMessageStatus(supabase, payload);
        break;

      case 'connection.update':
        console.log('🔌 Status de conexão atualizado');
        break;

      default:
        console.log('ℹ️ Evento não tratado:', eventType);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function handleIncomingMessage(supabase: any, payload: any) {
  try {
    const data = payload.data;
    const remoteJid = data.key?.remoteJid;
    const messageId = data.key?.id;
    const fromMe = data.key?.fromMe;

    const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '');

    if (fromMe) {
      console.log('↩️ Mensagem enviada por nós, ignorando');
      return;
    }

    // Extrair conteúdo da mensagem
    let messageContent = '';
    let messageType = 'text';
    let mediaUrl = null;

    const message = data.message;

    if (message?.conversation) {
      messageContent = message.conversation;
      messageType = 'text';
    } else if (message?.extendedTextMessage) {
      messageContent = message.extendedTextMessage.text;
      messageType = 'text';
    } else if (message?.imageMessage) {
      messageType = 'image';
      mediaUrl = message.imageMessage.url;
      messageContent = message.imageMessage.caption || '[Imagem]';
    } else if (message?.documentMessage) {
      messageType = 'document';
      mediaUrl = message.documentMessage.url;
      messageContent = message.documentMessage.caption || '[Documento]';
    } else if (message?.audioMessage) {
      messageType = 'audio';
      mediaUrl = message.audioMessage.url;
      messageContent = '[Áudio]';
    } else if (message?.videoMessage) {
      messageType = 'video';
      mediaUrl = message.videoMessage.url;
      messageContent = message.videoMessage.caption || '[Vídeo]';
    }

    console.log(`📱 De: ${phoneNumber}`);
    console.log(`💬 Tipo: ${messageType}`);
    console.log(`📝 Conteúdo: ${messageContent}`);

    // Invocar coach-agent para processar mensagem
    console.log('🤖 Invocando Coach Agent...');
    const { data: agentResponse, error: agentError } = await supabase.functions.invoke('coach-agent', {
      body: {
        phone: phoneNumber,
        message: messageContent,
        messageType: messageType,
        messageId: messageId,
      },
    });

    if (agentError) {
      console.error('❌ Erro ao invocar coach agent:', agentError);
    } else {
      console.log('✅ Coach agent processou mensagem:', agentResponse);
    }

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
}

async function handleMessageStatus(supabase: any, payload: any) {
  try {
    const data = payload.data;
    const messageId = data.key?.id;
    const status = data.status;

    console.log(`📊 Status da mensagem ${messageId}: ${status}`);

    let ourStatus = 'sent';
    let updateField: any = {};

    switch (status) {
      case 'DELIVERED':
        ourStatus = 'delivered';
        break;
      case 'READ':
        ourStatus = 'read';
        break;
      case 'FAILED':
        ourStatus = 'failed';
        break;
      default:
        ourStatus = 'sent';
    }

    // Atualizar status na tabela de mensagens de coaching
    const { error } = await supabase
      .from('coaching_messages')
      .update({ status: ourStatus })
      .eq('uazapi_message_id', messageId);

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return;
    }

    console.log('✅ Status atualizado');

  } catch (error) {
    console.error('❌ Erro ao processar status:', error);
  }
}
