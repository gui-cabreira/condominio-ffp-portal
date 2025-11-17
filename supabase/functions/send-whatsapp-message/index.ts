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

    // Configurações do UAZAPI
    const uazapiInstanceId = Deno.env.get('UAZAPI_INSTANCE_ID');
    const uazapiToken = Deno.env.get('UAZAPI_TOKEN') || Deno.env.get('UAZAPI_API_KEY');

    if (!uazapiInstanceId || !uazapiToken) {
      throw new Error('UAZAPI não configurado. Defina UAZAPI_INSTANCE_ID e UAZAPI_TOKEN');
    }

    // Formatar número (garantir que tem @s.whatsapp.net)
    const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

    console.log(`📱 Enviando para: ${formattedPhone}`);
    console.log(`💬 Mensagem: ${message.substring(0, 50)}...`);

    // Construir payload para UAZAPI
    let payload: any = {
      sessionId: uazapiInstanceId,
      to: formattedPhone,
    };

    // Se tem mídia, enviar como mensagem de mídia
    if (mediaUrl && mediaType) {
      payload = {
        ...payload,
        type: mediaType,
        [mediaType]: {
          url: mediaUrl,
          caption: message
        }
      };
    } else {
      // Mensagem de texto simples
      payload = {
        ...payload,
        type: 'text',
        text: {
          message: message
        }
      };
    }

    console.log('📦 Payload UAZAPI:', JSON.stringify(payload, null, 2));

    // Enviar via UAZAPI
    // API Endpoint: https://api.uazapi.com/v1/instance/send
    const uazapiUrl = 'https://api.uazapi.com/v1/instance/send';

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
      const cleanPhone = phone.replace(/\D/g, '');
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
          uazapi_message_id: result.id || result.messageId || null,
          direction: 'outbound',
          sender_phone: uazapiInstanceId,
          recipient_phone: phone,
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
          description: `Mensagem enviada via WhatsApp: ${message.substring(0, 50)}...`,
          metadata: {
            phone,
            message_id: result.id || result.messageId,
            conversation_id: conversation?.id,
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id || result.messageId,
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
