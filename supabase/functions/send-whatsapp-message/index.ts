import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  phone: string; // Número com DDI (ex: 5511999999999)
  message: string;
  conversationId?: string;
  chargeId?: string;
  mediaUrl?: string; // URL de imagem/documento para enviar
  mediaType?: 'image' | 'document' | 'audio' | 'video';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📤 Enviando mensagem via UAZAPI...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, message, conversationId, chargeId, mediaUrl, mediaType }: SendMessageRequest = await req.json();

    if (!phone || !message) {
      throw new Error('Phone e message são obrigatórios');
    }

    // Buscar configurações do servidor do banco de dados
    const { data: serverConfig } = await supabase
      .from('negotiation_parameters')
      .select('parameter_key, parameter_value')
      .in('parameter_key', ['whatsapp_server_url', 'whatsapp_admin_token']);
    
    let configServerUrl = '';
    let configAdminToken = '';
    
    serverConfig?.forEach((param: any) => {
      if (param.parameter_key === 'whatsapp_server_url') {
        configServerUrl = param.parameter_value;
      } else if (param.parameter_key === 'whatsapp_admin_token') {
        configAdminToken = param.parameter_value;
      }
    });
    
    // Usar configurações do banco ou fallback para secrets
    const uazapiInstanceId = Deno.env.get('UAZAPI_INSTANCE_ID');
    const uazapiToken = configAdminToken || Deno.env.get('UAZAPI_API_KEY');
    const uazapiBaseUrl = configServerUrl || 'https://api.uazapi.com';

    if (!uazapiToken) {
      throw new Error('UAZAPI não configurado. Configure nas configurações do sistema ou defina UAZAPI_API_KEY');
    }

    // Formatar número (remover caracteres especiais, manter apenas números)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    console.log(`📱 Enviando para: ${formattedPhone}`);
    console.log(`💬 Mensagem: ${message.substring(0, 50)}...`);
    console.log(`🌐 Servidor: ${uazapiBaseUrl}`);

    // Construir payload para UAZAPI
    let payload: any = {
      phone: cleanPhone,
      message: message,
    };

    // Se tem mídia, adicionar ao payload
    if (mediaUrl && mediaType) {
      payload = {
        phone: cleanPhone,
        caption: message,
        url: mediaUrl,
      };
    }

    console.log('📦 Payload UAZAPI:', JSON.stringify(payload, null, 2));

    // Determinar endpoint baseado no tipo de mensagem
    let endpoint = '/message/sendText';
    if (mediaUrl && mediaType) {
      switch (mediaType) {
        case 'image':
          endpoint = '/message/sendImage';
          break;
        case 'document':
          endpoint = '/message/sendDocument';
          break;
        case 'audio':
          endpoint = '/message/sendAudio';
          break;
        case 'video':
          endpoint = '/message/sendVideo';
          break;
      }
    }

    // Montar URL completa
    const instancePath = uazapiInstanceId ? `/${uazapiInstanceId}` : '';
    const uazapiUrl = `${uazapiBaseUrl}${endpoint}${instancePath}`;

    console.log(`🔗 URL: ${uazapiUrl}`);

    const response = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uazapiToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ UAZAPI error: ${response.status} - ${errorText}`);
      throw new Error(`UAZAPI error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Mensagem enviada via UAZAPI:', result);

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
      // Buscar conversa pelo telefone
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        conversation = existingConv;
      } else {
        // Criar nova conversa
        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone_number: cleanPhone,
            charge_id: chargeId || null,
            status: 'active',
            last_message_at: new Date().toISOString(),
            last_message_from: 'bot',
          })
          .select()
          .single();

        if (convError) {
          console.error('Erro ao criar conversa:', convError);
        } else {
          conversation = newConv;
        }
      }
    }

    // Salvar mensagem enviada no banco
    if (conversation) {
      await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          uazapi_message_id: result.id || result.messageId || result.key?.id || null,
          direction: 'outbound',
          sender_phone: uazapiInstanceId || 'system',
          recipient_phone: cleanPhone,
          message_type: mediaType || 'text',
          content: message,
          media_url: mediaUrl || null,
          status: 'sent',
        });

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: 'bot',
        })
        .eq('id', conversation.id);
    }

    // Registrar no timeline da cobrança se aplicável
    if (chargeId) {
      await supabase
        .from('charge_timeline')
        .insert({
          charge_id: chargeId,
          event_type: 'sent',
          event_data: {
            channel: 'whatsapp',
            phone: cleanPhone,
            message_id: result.id || result.messageId || result.key?.id,
            conversation_id: conversation?.id,
            message_preview: message.substring(0, 100),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id || result.messageId || result.key?.id,
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
