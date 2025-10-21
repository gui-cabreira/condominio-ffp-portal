import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 UAZAPI Webhook recebido');

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload
    const payload = await req.json();
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Logar webhook para auditoria
    const { error: logError } = await supabase
      .from('whatsapp_webhooks_log')
      .insert({
        event_type: payload.event || 'unknown',
        payload: payload,
        processed: false
      });

    if (logError) {
      console.error('❌ Erro ao logar webhook:', logError);
    }

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

    // Marcar como processado
    await supabase
      .from('whatsapp_webhooks_log')
      .update({ processed: true })
      .eq('payload->event', eventType)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(1);

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

    // Extrair número de telefone (remover @s.whatsapp.net)
    const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '');

    if (fromMe) {
      console.log('↩️ Mensagem enviada por nós, ignorando');
      return;
    }

    // Extrair conteúdo da mensagem
    let messageContent = '';
    let messageType = 'text';
    let mediaUrl = null;
    let mimetype = null;
    let caption = null;

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
      mimetype = message.imageMessage.mimetype;
      caption = message.imageMessage.caption || '';
      messageContent = caption;
    } else if (message?.documentMessage) {
      messageType = 'document';
      mediaUrl = message.documentMessage.url;
      mimetype = message.documentMessage.mimetype;
      caption = message.documentMessage.caption || '';
      messageContent = caption;
    } else if (message?.audioMessage) {
      messageType = 'audio';
      mediaUrl = message.audioMessage.url;
      mimetype = message.audioMessage.mimetype;
    } else if (message?.videoMessage) {
      messageType = 'video';
      mediaUrl = message.videoMessage.url;
      mimetype = message.videoMessage.mimetype;
      caption = message.videoMessage.caption || '';
      messageContent = caption;
    }

    console.log(`📱 De: ${phoneNumber}`);
    console.log(`💬 Tipo: ${messageType}`);
    console.log(`📝 Conteúdo: ${messageContent}`);

    // Buscar ou criar conversa
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar conversa:', convError);
    }

    if (!conversation) {
      // Criar nova conversa
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          phone_number: phoneNumber,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar conversa:', createError);
        return;
      }

      conversation = newConv;
      console.log('✅ Nova conversa criada:', conversation.id);
    } else {
      // Atualizar conversa existente
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer'
        })
        .eq('id', conversation.id);
    }

    // Salvar mensagem
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        uazapi_message_id: messageId,
        direction: 'inbound',
        sender_phone: phoneNumber,
        recipient_phone: payload.instanceId || 'system',
        message_type: messageType,
        content: messageContent,
        media_url: mediaUrl,
        media_mimetype: mimetype,
        status: 'received'
      });

    if (msgError) {
      console.error('❌ Erro ao salvar mensagem:', msgError);
      return;
    }

    console.log('✅ Mensagem salva no banco de dados');

    // TODO: Invocar LangGraph agent para processar mensagem
    // await supabase.functions.invoke('langgraph-agent', {
    //   body: {
    //     conversationId: conversation.id,
    //     phone: phoneNumber,
    //     message: messageContent,
    //     messageType: messageType
    //   }
    // });

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
}

async function handleMessageStatus(supabase: any, payload: any) {
  try {
    const data = payload.data;
    const messageId = data.key?.id;
    const status = data.status; // 'SENT', 'DELIVERED', 'READ', 'FAILED'

    console.log(`📊 Status da mensagem ${messageId}: ${status}`);

    // Mapear status do UAZAPI para nosso formato
    let ourStatus = 'sent';
    let updateField: any = {};

    switch (status) {
      case 'DELIVERED':
        ourStatus = 'delivered';
        updateField.delivered_at = new Date().toISOString();
        break;
      case 'READ':
        ourStatus = 'read';
        updateField.read_at = new Date().toISOString();
        break;
      case 'FAILED':
        ourStatus = 'failed';
        break;
      default:
        ourStatus = 'sent';
    }

    // Atualizar status da mensagem
    const { error } = await supabase
      .from('whatsapp_messages')
      .update({
        status: ourStatus,
        ...updateField
      })
      .eq('uazapi_message_id', messageId);

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return;
    }

    console.log('✅ Status atualizado no banco de dados');

  } catch (error) {
    console.error('❌ Erro ao processar status:', error);
  }
}
