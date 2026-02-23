import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Webhook handler para UAZAPI v2
 * 
 * Formato do evento UAZAPI v2:
 * {
 *   "event": "messages" | "messages_update" | "connection" | ...,
 *   "instance": "instance_id",
 *   "data": { ... payload específico do evento }
 * }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 UAZAPI v2 Webhook recebido');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('📦 Event:', payload.event, '| Instance:', payload.instance);

    const eventType = payload.event;
    const instanceId = payload.instance;
    const data = payload.data;

    // Logar webhook para auditoria
    await supabase
      .from('whatsapp_webhooks_log')
      .insert({
        event_type: eventType || 'unknown',
        instance_id: instanceId,
        phone_number: extractPhoneFromData(data, eventType),
        payload: payload,
        processed: false,
      });

    switch (eventType) {
      case 'messages':
        console.log('💬 Nova mensagem recebida');
        await handleIncomingMessage(supabase, instanceId, data);
        break;

      case 'messages_update':
        console.log('✅ Status de mensagem atualizado');
        await handleMessageStatus(supabase, data);
        break;

      case 'connection':
        console.log('🔌 Status de conexão atualizado');
        await handleConnectionUpdate(supabase, instanceId, data);
        break;

      default:
        console.log('ℹ️ Evento não tratado:', eventType);
    }

    // Marcar como processado
    await supabase
      .from('whatsapp_webhooks_log')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('instance_id', instanceId)
      .eq('event_type', eventType)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ success: true }),
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

function extractPhoneFromData(data: any, eventType: string): string | null {
  if (!data) return null;
  
  // UAZAPI v2 message format
  if (data.chatid) {
    return data.chatid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }
  if (data.sender) {
    return data.sender.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }
  // Fallback: try key format
  if (data.key?.remoteJid) {
    return data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }
  return null;
}

async function handleIncomingMessage(supabase: any, instanceId: string, data: any) {
  try {
    // UAZAPI v2 message format - pode vir como Message schema
    const chatId = data.chatid || data.key?.remoteJid || '';
    const messageId = data.messageid || data.id || data.key?.id || '';
    const fromMe = data.fromMe ?? data.key?.fromMe ?? false;
    const isGroup = data.isGroup ?? chatId.includes('@g.us');
    const senderName = data.senderName || data.pushName || '';

    const phoneNumber = chatId.replace('@s.whatsapp.net', '').replace('@g.us', '');

    // Ignorar mensagens de grupos e mensagens enviadas por nós
    if (isGroup || fromMe) {
      console.log('↩️ Mensagem ignorada (grupo ou enviada por nós)');
      return;
    }

    // Extrair conteúdo - UAZAPI v2 usa campo "text" e "messageType"
    let messageContent = data.text || '';
    let messageType = 'text';
    let mediaUrl = data.fileURL || null;
    let mimetype = null;
    let caption = null;

    const msgType = data.messageType || '';
    
    if (msgType === 'imageMessage' || msgType === 'image') {
      messageType = 'image';
      caption = messageContent;
      messageContent = caption || '[Imagem]';
    } else if (msgType === 'documentMessage' || msgType === 'document') {
      messageType = 'document';
      caption = messageContent;
      messageContent = caption || '[Documento]';
    } else if (msgType === 'audioMessage' || msgType === 'audio' || msgType === 'ptt') {
      messageType = 'audio';
      messageContent = messageContent || '[Áudio]';
    } else if (msgType === 'videoMessage' || msgType === 'video') {
      messageType = 'video';
      caption = messageContent;
      messageContent = caption || '[Vídeo]';
    } else if (msgType === 'stickerMessage' || msgType === 'sticker') {
      messageType = 'sticker';
      messageContent = '[Figurinha]';
    } else if (msgType === 'locationMessage' || msgType === 'location') {
      messageType = 'location';
      messageContent = '[Localização]';
    } else if (msgType === 'contactMessage' || msgType === 'contact') {
      messageType = 'contact';
      messageContent = '[Contato]';
    } else if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
      messageType = 'text';
      // messageContent já está definido via data.text
    }

    // Se text está vazio mas tem content (fallback)
    if (!messageContent && data.content) {
      if (typeof data.content === 'string') {
        messageContent = data.content;
      }
    }

    // Fallback: tentar formato antigo do baileys (data.message)
    if (!messageContent && data.message) {
      const msg = data.message;
      if (msg.conversation) messageContent = msg.conversation;
      else if (msg.extendedTextMessage) messageContent = msg.extendedTextMessage.text;
      else if (msg.imageMessage) { messageType = 'image'; messageContent = msg.imageMessage.caption || '[Imagem]'; mediaUrl = msg.imageMessage.url; }
      else if (msg.documentMessage) { messageType = 'document'; messageContent = msg.documentMessage.caption || msg.documentMessage.fileName || '[Documento]'; mediaUrl = msg.documentMessage.url; }
      else if (msg.audioMessage) { messageType = 'audio'; messageContent = '[Áudio]'; mediaUrl = msg.audioMessage.url; }
      else if (msg.videoMessage) { messageType = 'video'; messageContent = msg.videoMessage.caption || '[Vídeo]'; mediaUrl = msg.videoMessage.url; }
    }

    console.log(`📱 De: ${phoneNumber} (${senderName})`);
    console.log(`💬 Tipo: ${messageType} | Conteúdo: ${messageContent?.substring(0, 80)}`);

    // Buscar ou criar conversa
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          phone_number: phoneNumber,
          contact_name: senderName,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
          last_message_preview: (messageContent || '').substring(0, 100),
          unread_count: 1,
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
      await supabase
        .from('whatsapp_conversations')
        .update({
          contact_name: senderName || conversation.contact_name,
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
          last_message_preview: (messageContent || '').substring(0, 100),
          unread_count: (conversation.unread_count || 0) + 1,
          updated_at: new Date().toISOString(),
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
        recipient_phone: instanceId || 'system',
        message_type: messageType,
        content: messageContent,
        media_url: mediaUrl,
        media_mimetype: mimetype,
        caption: caption,
        status: 'received',
        metadata: {
          senderName,
          messageType: msgType,
          wasSentByApi: data.wasSentByApi || false,
        },
      })
      .select()
      .single();

    if (msgError) {
      console.error('❌ Erro ao salvar mensagem:', msgError);
      return;
    }
    console.log('✅ Mensagem salva:', savedMessage.id);

    // Notificar operadores
    try {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'assistant']);

      if (adminUsers && adminUsers.length > 0) {
        const notifs = adminUsers.map((u: any) => ({
          user_id: u.user_id,
          title: `Nova mensagem de ${senderName || phoneNumber}`,
          message: (messageContent || '[Mídia]').substring(0, 100),
          type: 'info',
          category: 'whatsapp',
          action_url: '/portal/corporativo/atendimento',
          metadata: { conversation_id: conversation.id, phone: phoneNumber },
        }));
        await supabase.from('notifications').insert(notifs);
        console.log('🔔 Notificações criadas para', adminUsers.length, 'operadores');
      }
    } catch (notifError) {
      console.error('⚠️ Erro ao criar notificações:', notifError);
    }

    // Verificar comprovante de pagamento
    if (['image', 'document'].includes(messageType) && mediaUrl) {
      console.log('📎 Possível comprovante detectado');
      if (conversation.awaiting_response_type === 'proof' || conversation.status === 'waiting_proof') {
        const { data: charge } = await supabase
          .from('charges')
          .select('id')
          .eq('unit_id', conversation.unit_id)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (charge) {
          await supabase.from('payment_proofs').insert({
            charge_id: charge.id,
            conversation_id: conversation.id,
            message_id: savedMessage.id,
            file_url: mediaUrl,
            file_type: mimetype,
            status: 'pending',
          });
          console.log('✅ Comprovante registrado');
        }
      }
    }

    // Invocar LangGraph agent
    console.log('🤖 Invocando LangGraph Agent...');
    const { data: agentResponse, error: agentError } = await supabase.functions.invoke('langgraph-agent', {
      body: {
        conversationId: conversation.id,
        phone: phoneNumber,
        message: messageContent,
        messageType,
      },
    });

    if (agentError) {
      console.error('❌ Erro ao invocar agent:', agentError);
    } else {
      console.log('✅ Agent processou mensagem');
    }

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
}

async function handleMessageStatus(supabase: any, data: any) {
  try {
    // UAZAPI v2: data contém messageid e status
    const messageId = data.messageid || data.id || data.key?.id;
    const status = data.status;

    if (!messageId) {
      console.log('⚠️ Status update sem messageId');
      return;
    }

    console.log(`📊 Status da mensagem ${messageId}: ${status}`);

    let ourStatus = 'sent';
    const updateFields: Record<string, string> = {};

    // UAZAPI v2 status values
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'delivered' || statusStr === 'delivery_ack' || status === 2) {
      ourStatus = 'delivered';
      updateFields.delivered_at = new Date().toISOString();
    } else if (statusStr === 'read' || statusStr === 'played' || status === 3 || status === 4) {
      ourStatus = 'read';
      updateFields.read_at = new Date().toISOString();
    } else if (statusStr === 'error' || statusStr === 'failed' || status === 5) {
      ourStatus = 'failed';
      updateFields.error_message = data.error || 'Falha no envio';
    } else if (statusStr === 'deleted') {
      ourStatus = 'deleted';
    }

    await supabase
      .from('whatsapp_messages')
      .update({ status: ourStatus, ...updateFields })
      .eq('uazapi_message_id', messageId);

    console.log('✅ Status atualizado');
  } catch (error) {
    console.error('❌ Erro ao processar status:', error);
  }
}

async function handleConnectionUpdate(supabase: any, instanceId: string, data: any) {
  try {
    // UAZAPI v2 connection event
    const state = data.state || data.status;
    const qrCode = data.qr || data.qrcode;

    console.log(`🔌 Instância ${instanceId}: state=${state}`);

    const updateData: Record<string, unknown> = {
      status: state === 'open' || state === 'connected' ? 'connected' : 'disconnected',
      updated_at: new Date().toISOString(),
    };

    if (qrCode) {
      updateData.qr_code = qrCode;
    }

    // Tentar atualizar por instance_id
    const { error } = await supabase
      .from('uazapi_instances')
      .update(updateData)
      .eq('instance_id', instanceId);

    if (error) {
      console.error('❌ Erro ao atualizar instância por instance_id, tentando por name...');
      await supabase
        .from('uazapi_instances')
        .update(updateData)
        .eq('name', instanceId);
    }

    console.log('✅ Status da instância atualizado');
  } catch (error) {
    console.error('❌ Erro ao atualizar conexão:', error);
  }
}
