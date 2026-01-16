import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração intrínseca do servidor UAZAPI
const UAZAPI_SERVER_URL = "https://appnow.uazapi.com";

interface SSERequest {
  action: 'connect' | 'fetch_history' | 'fetch_profile_picture' | 'sync_contacts';
  instanceId: string;
  apiKey: string;
  phone?: string;
  count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: SSERequest = await req.json();
    const { action, instanceId, apiKey } = body;

    console.log("UAZAPI SSE action:", action, "instance:", instanceId);

    switch (action) {
      case 'fetch_history': {
        // Buscar histórico de conversas de um número
        const { phone, count = 50 } = body;
        
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Número não informado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Formatar número para JID
        const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

        const response = await fetch(`${UAZAPI_SERVER_URL}/chat/fetchMessages/${instanceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            remoteJid: jid,
            limit: count,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro ao buscar histórico:", errorText);
          return new Response(
            JSON.stringify({ success: false, error: "Falha ao buscar histórico" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const messages = await response.json();

        // Salvar mensagens no banco
        const { data: dbInstance } = await supabase
          .from('uazapi_instances')
          .select('id')
          .eq('instance_id', instanceId)
          .single();

        if (dbInstance && Array.isArray(messages)) {
          // Buscar ou criar conversa
          const phoneClean = phone.replace(/\D/g, '');
          let { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('phone_number', phoneClean)
            .single();

          if (!conversation) {
            const { data: newConv } = await supabase
              .from('whatsapp_conversations')
              .insert({
                phone_number: phoneClean,
                status: 'active',
              })
              .select('id')
              .single();
            conversation = newConv;
          }

          if (conversation) {
            // Inserir mensagens
            for (const msg of messages) {
              const existingMsg = await supabase
                .from('whatsapp_messages')
                .select('id')
                .eq('uazapi_message_id', msg.key?.id)
                .single();

              if (!existingMsg.data) {
                await supabase
                  .from('whatsapp_messages')
                  .insert({
                    conversation_id: conversation.id,
                    uazapi_message_id: msg.key?.id,
                    direction: msg.key?.fromMe ? 'outgoing' : 'incoming',
                    content: msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text ||
                             '[mídia]',
                    message_type: msg.messageType || 'text',
                    status: 'delivered',
                    created_at: new Date(msg.messageTimestamp * 1000).toISOString(),
                  });
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            messages: messages,
            count: Array.isArray(messages) ? messages.length : 0 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'fetch_profile_picture': {
        // Buscar foto de perfil
        const { phone } = body;
        
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Número não informado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

        const response = await fetch(`${UAZAPI_SERVER_URL}/chat/fetchProfilePictureUrl/${instanceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            number: jid,
          }),
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: "Foto não disponível" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();

        return new Response(
          JSON.stringify({ success: true, pictureUrl: data.profilePictureUrl || data.picture }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'sync_contacts': {
        // Sincronizar contatos/conversas da instância
        const response = await fetch(`${UAZAPI_SERVER_URL}/chat/fetchChats/${instanceId}`, {
          method: 'GET',
          headers: {
            'apikey': apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro ao sincronizar contatos:", errorText);
          return new Response(
            JSON.stringify({ success: false, error: "Falha ao sincronizar" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const chats = await response.json();

        // Salvar contatos no banco
        let syncedCount = 0;
        if (Array.isArray(chats)) {
          for (const chat of chats) {
            const phone = chat.id?.replace('@s.whatsapp.net', '').replace('@g.us', '');
            if (!phone || chat.id?.includes('@g.us')) continue; // Ignorar grupos

            const { data: existing } = await supabase
              .from('whatsapp_conversations')
              .select('id')
              .eq('phone_number', phone)
              .single();

            if (!existing) {
              await supabase
                .from('whatsapp_conversations')
                .insert({
                  phone_number: phone,
                  contact_name: chat.name || chat.pushName || null,
                  status: 'active',
                  last_message_at: chat.conversationTimestamp 
                    ? new Date(chat.conversationTimestamp * 1000).toISOString()
                    : null,
                });
              syncedCount++;
            } else {
              // Atualizar nome se disponível
              if (chat.name || chat.pushName) {
                await supabase
                  .from('whatsapp_conversations')
                  .update({
                    contact_name: chat.name || chat.pushName,
                  })
                  .eq('id', existing.id);
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            total: Array.isArray(chats) ? chats.length : 0,
            synced: syncedCount 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'connect': {
        // Conectar ao SSE para receber eventos em tempo real
        // Esta é uma conexão persistente que precisa ser mantida pelo cliente
        // Por limitações de edge functions, retornamos instruções para o cliente
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Para conexão SSE em tempo real, use o webhook configurado",
            webhookUrl: `${supabaseUrl}/functions/v1/uazapi-webhook`,
            events: [
              'messages.upsert',
              'messages.update', 
              'connection.update',
              'chats.update',
              'presence.update'
            ]
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Erro no uazapi-sse:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
