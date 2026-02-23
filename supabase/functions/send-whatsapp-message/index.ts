import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  phone: string;
  message: string;
  conversationId?: string;
  chargeId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio' | 'video';
  instanceId?: string;
  instanceToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📤 Enviando mensagem via UAZAPI v2...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendMessageRequest = await req.json();
    const { phone, message, conversationId, chargeId, mediaUrl, mediaType, instanceId, instanceToken } = body;

    if (!phone || !message) {
      throw new Error('Phone e message são obrigatórios');
    }

    // Determinar token e URL do servidor
    let token = instanceToken || '';
    let serverUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://appnow.uazapi.com';

    // Se não recebeu token, buscar instância do banco
    if (!token) {
      let query = supabase
        .from('uazapi_instances')
        .select('api_key, base_url, instance_id')
        .eq('status', 'connected');

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      } else {
        query = query.eq('is_default', true);
      }

      const { data: instances } = await query.limit(1);

      if (instances && instances.length > 0) {
        token = instances[0].api_key;
        serverUrl = instances[0].base_url || serverUrl;
      } else {
        // Fallback: buscar qualquer instância conectada
        const { data: anyInstance } = await supabase
          .from('uazapi_instances')
          .select('api_key, base_url, instance_id')
          .eq('status', 'connected')
          .limit(1);

        if (anyInstance && anyInstance.length > 0) {
          token = anyInstance[0].api_key;
          serverUrl = anyInstance[0].base_url || serverUrl;
        } else {
          throw new Error('Nenhuma instância WhatsApp conectada encontrada');
        }
      }
    }

    if (!token) {
      throw new Error('Token da instância não disponível');
    }

    // Formatar número - apenas dígitos
    const cleanPhone = phone.replace(/\D/g, '');

    console.log(`📱 Enviando para: ${cleanPhone}`);
    console.log(`💬 Mensagem: ${message.substring(0, 50)}...`);
    console.log(`🌐 Servidor: ${serverUrl}`);

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mediaUrl && mediaType) {
      // UAZAPI v2: POST /send/media com header "token"
      endpoint = '/send/media';
      const typeMap: Record<string, string> = {
        image: 'image',
        document: 'document',
        audio: 'audio',
        video: 'video',
      };
      payload = {
        number: cleanPhone,
        type: typeMap[mediaType] || 'document',
        file: mediaUrl,
        text: message, // caption
      };
    } else {
      // UAZAPI v2: POST /send/text com header "token"
      endpoint = '/send/text';
      payload = {
        number: cleanPhone,
        text: message,
        delay: 1000, // Simula digitação por 1 segundo
      };
    }

    const uazapiUrl = `${serverUrl}${endpoint}`;
    console.log(`🔗 URL: ${uazapiUrl}`);
    console.log(`📦 Payload:`, JSON.stringify(payload));

    const response = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token, // UAZAPI v2 usa header "token", NÃO "Authorization: Bearer"
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ UAZAPI error: ${response.status} - ${errorText}`);
      throw new Error(`UAZAPI error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Mensagem enviada via UAZAPI:', JSON.stringify(result).substring(0, 500));

    // Extrair messageId da resposta UAZAPI v2
    const messageId = result.messageid || result.id || result.key?.id || null;

    // Buscar ou criar conversa
    let conversation;
    if (conversationId) {
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = existingConv;
    } else {
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', cleanPhone)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone_number: cleanPhone,
            charge_id: chargeId || null,
            status: 'active',
            last_message_at: new Date().toISOString(),
            last_message_from: 'bot',
            last_message_preview: message.substring(0, 100),
          })
          .select()
          .single();
        conversation = newConv;
      }
    }

    // Salvar mensagem enviada
    if (conversation) {
      await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          uazapi_message_id: messageId,
          direction: 'outbound',
          sender_phone: 'system',
          recipient_phone: cleanPhone,
          message_type: mediaType || 'text',
          content: message,
          media_url: mediaUrl || null,
          status: 'sent',
        });

      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: 'bot',
          last_message_preview: message.substring(0, 100),
        })
        .eq('id', conversation.id);
    }

    // Timeline da cobrança
    if (chargeId) {
      await supabase
        .from('charge_timeline')
        .insert({
          charge_id: chargeId,
          event_type: 'sent',
          event_data: {
            channel: 'whatsapp',
            phone: cleanPhone,
            message_id: messageId,
            conversation_id: conversation?.id,
            message_preview: message.substring(0, 100),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        conversationId: conversation?.id,
        result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
