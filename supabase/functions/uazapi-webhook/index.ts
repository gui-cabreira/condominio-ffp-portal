import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 UAZAPI Webhook recebido');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Logar webhook para auditoria
    const { error: logError } = await supabase
      .from('whatsapp_webhooks_log')
      .insert({
        event_type: payload.event || 'unknown',
        instance_id: payload.instanceId,
        phone_number: payload.data?.key?.remoteJid?.replace('@s.whatsapp.net', ''),
        payload: payload,
        processed: false
      });

    if (logError) {
      console.error('❌ Erro ao logar webhook:', logError);
    }

    const eventType = payload.event;
    
    switch (eventType) {
      case 'messages':           // CRÍTICO - Evento principal UAZAPI
      case 'message.received':
      case 'messages.upsert':
        console.log('💬 Nova mensagem recebida');
        await handleIncomingMessage(supabase, payload);
        break;
      
      case 'messages_update':
      case 'message.status':
      case 'messages.update':
        console.log('✅ Status de mensagem atualizado');
        await handleMessageStatus(supabase, payload);
        break;
      
      case 'connection':
      case 'connection.update':
        console.log('🔌 Status de conexão atualizado');
        await handleConnectionUpdate(supabase, payload);
        break;
      
      default:
        console.log('ℹ️ Evento não tratado:', eventType);
    }

    // Marcar como processado
    await supabase
      .from('whatsapp_webhooks_log')
      .update({ 
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('event_type', eventType)
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
    const pushName = data.pushName;

    const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '');

    // Ignorar mensagens de grupos e mensagens enviadas por nós
    if (remoteJid?.includes('@g.us') || fromMe) {
      console.log('↩️ Mensagem ignorada (grupo ou enviada por nós)');
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
      mediaUrl = message.imageMessage.url || payload.mediaUrl;
      mimetype = message.imageMessage.mimetype;
      caption = message.imageMessage.caption || '';
      messageContent = caption;
    } else if (message?.documentMessage) {
      messageType = 'document';
      mediaUrl = message.documentMessage.url || payload.mediaUrl;
      mimetype = message.documentMessage.mimetype;
      caption = message.documentMessage.caption || message.documentMessage.fileName || '';
      messageContent = caption;
    } else if (message?.audioMessage) {
      messageType = 'audio';
      mediaUrl = message.audioMessage.url || payload.mediaUrl;
      mimetype = message.audioMessage.mimetype;
      messageContent = '[Áudio]';
    } else if (message?.videoMessage) {
      messageType = 'video';
      mediaUrl = message.videoMessage.url || payload.mediaUrl;
      mimetype = message.videoMessage.mimetype;
      caption = message.videoMessage.caption || '';
      messageContent = caption || '[Vídeo]';
    } else if (message?.stickerMessage) {
      messageType = 'sticker';
      messageContent = '[Figurinha]';
    } else if (message?.locationMessage) {
      messageType = 'location';
      messageContent = `[Localização: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}]`;
    } else if (message?.contactMessage) {
      messageType = 'contact';
      messageContent = `[Contato: ${message.contactMessage.displayName}]`;
    }

    console.log(`📱 De: ${phoneNumber} (${pushName})`);
    console.log(`💬 Tipo: ${messageType}`);
    console.log(`📝 Conteúdo: ${messageContent}`);

    // Buscar ou criar conversa
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error('❌ Erro ao buscar conversa:', convError);
    }

    if (!conversation) {
      // Criar nova conversa
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          phone_number: phoneNumber,
          contact_name: pushName,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
          last_message_preview: messageContent.substring(0, 100),
          unread_count: 1
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
          contact_name: pushName || conversation.contact_name,
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
          last_message_preview: messageContent.substring(0, 100),
          unread_count: (conversation.unread_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    }

    // Salvar mensagem
    const { data: savedMessage, error: msgError } = await supabase
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
        caption: caption,
        status: 'received',
        metadata: {
          pushName,
          rawMessage: message
        }
      })
      .select()
      .single();

    if (msgError) {
      console.error('❌ Erro ao salvar mensagem:', msgError);
      return;
    }

    console.log('✅ Mensagem salva:', savedMessage.id);

    // Verificar se é comprovante de pagamento (imagem ou documento)
    if (['image', 'document'].includes(messageType) && mediaUrl) {
      console.log('📎 Possível comprovante detectado');
      
      // Se a conversa está aguardando comprovante, criar registro
      if (conversation.awaiting_response_type === 'proof' || conversation.status === 'waiting_proof') {
        // Buscar cobrança associada
        const { data: charge } = await supabase
          .from('charges')
          .select('id')
          .eq('unit_id', conversation.unit_id)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (charge) {
          await supabase
            .from('payment_proofs')
            .insert({
              charge_id: charge.id,
              conversation_id: conversation.id,
              message_id: savedMessage.id,
              file_url: mediaUrl,
              file_type: mimetype,
              status: 'pending'
            });

          console.log('✅ Comprovante registrado para análise');
        }
      }
    }

    // Invocar LangGraph agent para processar mensagem
    console.log('🤖 Invocando LangGraph Agent...');
    const { data: agentResponse, error: agentError } = await supabase.functions.invoke('langgraph-agent', {
      body: {
        conversationId: conversation.id,
        phone: phoneNumber,
        message: messageContent,
        messageType: messageType
      }
    });

    if (agentError) {
      console.error('❌ Erro ao invocar agent:', agentError);
    } else {
      console.log('✅ Agent processou mensagem:', agentResponse);
    }

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
}

async function handleMessageStatus(supabase: any, payload: any) {
  try {
    const data = payload.data;
    const messageId = data.key?.id || data.id;
    const status = data.status || data.update?.status;

    console.log(`📊 Status da mensagem ${messageId}: ${status}`);

    let ourStatus = 'sent';
    let updateFields: any = {};

    switch (status) {
      case 'DELIVERY_ACK':
      case 'DELIVERED':
      case 2:
        ourStatus = 'delivered';
        updateFields.delivered_at = new Date().toISOString();
        break;
      case 'READ':
      case 'PLAYED':
      case 3:
      case 4:
        ourStatus = 'read';
        updateFields.read_at = new Date().toISOString();
        break;
      case 'ERROR':
      case 'FAILED':
      case 5:
        ourStatus = 'failed';
        updateFields.error_message = data.error || 'Falha no envio';
        break;
      default:
        ourStatus = 'sent';
    }

    const { error } = await supabase
      .from('whatsapp_messages')
      .update({
        status: ourStatus,
        ...updateFields
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

async function handleConnectionUpdate(supabase: any, payload: any) {
  try {
    const instanceId = payload.instanceId;
    const state = payload.data?.state || payload.state;
    const qrCode = payload.data?.qr || payload.qr;

    console.log(`🔌 Instância ${instanceId}: ${state}`);

    const updateData: any = {
      status: state === 'open' ? 'connected' : 'disconnected',
      updated_at: new Date().toISOString()
    };

    if (qrCode) {
      updateData.qr_code = qrCode;
    }

    await supabase
      .from('uazapi_instances')
      .update(updateData)
      .eq('instance_id', instanceId);

    console.log('✅ Status da instância atualizado');

  } catch (error) {
    console.error('❌ Erro ao atualizar conexão:', error);
  }
}
