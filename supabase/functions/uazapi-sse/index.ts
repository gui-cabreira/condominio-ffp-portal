import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL") || "https://appnow.uazapi.com";

interface SSERequest {
  action: "sync_chats" | "sync_messages" | "fetch_profile_picture";
  instanceToken: string;
  phone?: string;
  limit?: number;
  offset?: number;
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
    const { action, instanceToken } = body;

    console.log(`[UAZAPI Sync] Action: ${action}`);

    switch (action) {
      case "sync_chats": {
        // UAZAPI v2: POST /chat/find with "token" header
        const limit = body.limit || 100;
        const offset = body.offset || 0;

        const response = await fetch(`${UAZAPI_SERVER_URL}/chat/find`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: instanceToken,
          },
          body: JSON.stringify({
            operator: "AND",
            sort: "-wa_lastMsgTimestamp",
            limit,
            offset,
            wa_isGroup: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[UAZAPI Sync] Error fetching chats:", errorText);
          return jsonResponse({ success: false, error: "Falha ao buscar chats", details: errorText }, 500);
        }

        const result = await response.json();
        const chats = result.chats || result || [];

        console.log(`[UAZAPI Sync] Found ${Array.isArray(chats) ? chats.length : 0} chats`);
        if (Array.isArray(chats) && chats.length > 0) {
          console.log(`[UAZAPI Sync] Sample chat:`, JSON.stringify(chats[0]).substring(0, 500));
        }

        let syncedCount = 0;
        let updatedCount = 0;

        if (Array.isArray(chats)) {
          for (const chat of chats) {
            // Extract phone - try multiple fields
            const rawPhone = chat.phone || chat.wa_chatid?.replace("@s.whatsapp.net", "") || chat.wa_fastid?.split(":")[1] || "";
            const phone = rawPhone.replace("@s.whatsapp.net", "").replace("@g.us", "").replace(/\D/g, "");

            // Skip empty, groups, or status broadcasts
            if (!phone || phone.length < 8 || (chat.wa_chatid || "").includes("@g.us") || (chat.wa_isGroup === true)) continue;

            const contactName = chat.wa_contactName || chat.wa_name || chat.name || chat.lead_name || null;
            const lastMsgTs = chat.wa_lastMsgTimestamp;
            const lastMsgTimestamp = lastMsgTs
              ? new Date(lastMsgTs > 9999999999 ? lastMsgTs : lastMsgTs * 1000).toISOString()
              : null;
            // Validate timestamp is reasonable (between 2020 and 2030)
            const validTimestamp = lastMsgTimestamp && new Date(lastMsgTimestamp).getFullYear() >= 2020 && new Date(lastMsgTimestamp).getFullYear() <= 2030
              ? lastMsgTimestamp : null;
            const unreadCount = chat.wa_unreadCount || 0;

            const { data: existing } = await supabase
              .from("whatsapp_conversations")
              .select("id, contact_name")
              .eq("phone_number", phone)
              .single();

            if (!existing) {
              const { error: insertError } = await supabase.from("whatsapp_conversations").insert({
                phone_number: phone,
                contact_name: contactName,
                status: "active",
                last_message_at: validTimestamp,
                unread_count: unreadCount,
                last_message_preview: chat.wa_lastMessageTextVote || null,
              });
              if (insertError) {
                console.error(`[UAZAPI Sync] Insert error for ${phone}:`, JSON.stringify(insertError));
              } else {
                syncedCount++;
              }
            } else {
              // Update existing conversation
              const updates: Record<string, unknown> = {};
              if (contactName && contactName !== existing.contact_name) updates.contact_name = contactName;
              if (lastMsgTimestamp) updates.last_message_at = lastMsgTimestamp;
              if (unreadCount > 0) updates.unread_count = unreadCount;

              if (Object.keys(updates).length > 0) {
                await supabase.from("whatsapp_conversations").update(updates).eq("id", existing.id);
                updatedCount++;
              }
            }
          }
        }

        return jsonResponse({
          success: true,
          total: Array.isArray(chats) ? chats.length : 0,
          synced: syncedCount,
          updated: updatedCount,
          pagination: result.pagination || null,
        });
      }

      case "sync_messages": {
        const { phone } = body;
        if (!phone) {
          return jsonResponse({ success: false, error: "Número não informado" }, 400);
        }

        const phoneClean = phone.replace(/\D/g, "");
        const chatid = `${phoneClean}@s.whatsapp.net`;
        const limit = body.limit || 50;

        // UAZAPI v2: POST /message/find with "token" header
        const response = await fetch(`${UAZAPI_SERVER_URL}/message/find`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: instanceToken,
          },
          body: JSON.stringify({
            chatid,
            limit,
            offset: 0,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[UAZAPI Sync] Error fetching messages:", errorText);
          return jsonResponse({ success: false, error: "Falha ao buscar mensagens" }, 500);
        }

        const result = await response.json();
        const messages = result.messages || result || [];

        console.log(`[UAZAPI Sync] Found ${Array.isArray(messages) ? messages.length : 0} messages for ${phoneClean}`);

        // Ensure conversation exists
        let { data: conversation } = await supabase
          .from("whatsapp_conversations")
          .select("id")
          .eq("phone_number", phoneClean)
          .single();

        if (!conversation) {
          const { data: newConv } = await supabase
            .from("whatsapp_conversations")
            .insert({ phone_number: phoneClean, status: "active" })
            .select("id")
            .single();
          conversation = newConv;
        }

        if (!conversation) {
          return jsonResponse({ success: false, error: "Falha ao criar conversa" }, 500);
        }

        let importedCount = 0;

        if (Array.isArray(messages)) {
          for (const msg of messages) {
            const msgId = msg.messageid || msg.id;
            if (!msgId) continue;

            // Check if already imported
            const { data: existingMsg } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("uazapi_message_id", msgId)
              .single();

            if (existingMsg) continue;

            const content = msg.text || msg.convertOptions || "[mídia]";
            const direction = msg.fromMe ? "outbound" : "inbound";
            const messageType = msg.messageType || "text";
            const mediaUrl = msg.fileURL || null;
            const timestamp = msg.messageTimestamp
              ? new Date(msg.messageTimestamp > 9999999999 ? msg.messageTimestamp : msg.messageTimestamp * 1000).toISOString()
              : new Date().toISOString();

            const { error } = await supabase.from("whatsapp_messages").insert({
              conversation_id: conversation.id,
              uazapi_message_id: msgId,
              direction,
              content,
              message_type: messageType,
              media_url: mediaUrl,
              status: "delivered",
              created_at: timestamp,
              sender_phone: msg.sender?.replace("@s.whatsapp.net", "") || null,
            });

            if (!error) importedCount++;
          }

          // Update conversation last message
          if (messages.length > 0) {
            const lastMsg = messages[0]; // Most recent
            await supabase
              .from("whatsapp_conversations")
              .update({
                last_message_at: lastMsg.messageTimestamp
                  ? new Date(lastMsg.messageTimestamp > 9999999999 ? lastMsg.messageTimestamp : lastMsg.messageTimestamp * 1000).toISOString()
                  : new Date().toISOString(),
                last_message_preview: lastMsg.text || "[mídia]",
                last_message_from: lastMsg.fromMe ? "system" : "customer",
              })
              .eq("id", conversation.id);
          }
        }

        return jsonResponse({
          success: true,
          conversationId: conversation.id,
          total: Array.isArray(messages) ? messages.length : 0,
          imported: importedCount,
          hasMore: result.hasMore || false,
        });
      }

      case "fetch_profile_picture": {
        const { phone } = body;
        if (!phone) {
          return jsonResponse({ success: false, error: "Número não informado" }, 400);
        }

        // UAZAPI v2 doesn't have a specific profile pic endpoint in the spec
        // But the chat data already includes image/imagePreview
        return jsonResponse({ success: true, pictureUrl: null, message: "Use chat data for profile pictures" });
      }

      default:
        return jsonResponse({ success: false, error: "Ação inválida" }, 400);
    }
  } catch (error) {
    console.error("[UAZAPI Sync] Error:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
