import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UAZAPI_SERVER_URL = Deno.env.get("UAZAPI_SERVER_URL") || "https://appnow.uazapi.com";

interface SSERequest {
  action: "sync_chats" | "sync_messages" | "fetch_profile_picture" | "sync_all";
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
        return await syncChats(supabase, instanceToken, body.limit || 100, body.offset || 0);
      }

      case "sync_messages": {
        return await syncMessages(supabase, instanceToken, body.phone || "", body.limit || 50);
      }

      case "fetch_profile_picture": {
        return await fetchProfilePicture(supabase, instanceToken, body.phone || "");
      }

      case "sync_all": {
        // Full sync: chats + messages for top conversations + avatars
        const chatResult = await syncChatsInternal(supabase, instanceToken, body.limit || 200, 0);
        
        // Sync messages for top 20 conversations
        const { data: topConvs } = await supabase
          .from("whatsapp_conversations")
          .select("phone_number")
          .order("last_message_at", { ascending: false })
          .limit(20);

        let totalMsgsImported = 0;
        if (topConvs) {
          for (const conv of topConvs) {
            const msgResult = await syncMessagesInternal(supabase, instanceToken, conv.phone_number, 30);
            totalMsgsImported += msgResult.imported;
          }
        }

        // Fetch avatars for conversations without one
        const { data: noAvatarConvs } = await supabase
          .from("whatsapp_conversations")
          .select("id, phone_number")
          .is("avatar_url", null)
          .order("last_message_at", { ascending: false })
          .limit(50);

        let avatarsUpdated = 0;
        if (noAvatarConvs) {
          for (const conv of noAvatarConvs) {
            const avatarUrl = await fetchAvatarUrl(instanceToken, conv.phone_number);
            if (avatarUrl) {
              await supabase
                .from("whatsapp_conversations")
                .update({ avatar_url: avatarUrl })
                .eq("id", conv.id);
              avatarsUpdated++;
            }
          }
        }

        return jsonResponse({
          success: true,
          chats: chatResult,
          messagesImported: totalMsgsImported,
          avatarsUpdated,
        });
      }

      default:
        return jsonResponse({ success: false, error: "Ação inválida" }, 400);
    }
  } catch (error) {
    console.error("[UAZAPI Sync] Error:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
});

// ========== SYNC CHATS ==========
async function syncChats(supabase: any, token: string, limit: number, offset: number) {
  const result = await syncChatsInternal(supabase, token, limit, offset);
  return jsonResponse(result);
}

async function syncChatsInternal(supabase: any, token: string, limit: number, offset: number) {
  const response = await fetch(`${UAZAPI_SERVER_URL}/chat/find`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
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
    return { success: false, error: "Falha ao buscar chats", details: errorText };
  }

  const result = await response.json();
  const chats = result.chats || result || [];

  console.log(`[UAZAPI Sync] Found ${Array.isArray(chats) ? chats.length : 0} chats`);

  let syncedCount = 0;
  let updatedCount = 0;

  if (Array.isArray(chats)) {
    for (const chat of chats) {
      const rawPhone = chat.phone || chat.wa_chatid?.replace("@s.whatsapp.net", "") || chat.wa_fastid?.split(":")[1] || "";
      const phone = rawPhone.replace("@s.whatsapp.net", "").replace("@g.us", "").replace(/\D/g, "");

      if (!phone || phone.length < 8 || (chat.wa_chatid || "").includes("@g.us") || chat.wa_isGroup === true) continue;

      const contactName = chat.wa_contactName || chat.wa_name || chat.name || chat.lead_name || null;
      const lastMsgTs = chat.wa_lastMsgTimestamp;
      const lastMsgTimestamp = lastMsgTs
        ? new Date(lastMsgTs > 9999999999 ? lastMsgTs : lastMsgTs * 1000).toISOString()
        : null;
      const validTimestamp = lastMsgTimestamp && new Date(lastMsgTimestamp).getFullYear() >= 2020 && new Date(lastMsgTimestamp).getFullYear() <= 2030
        ? lastMsgTimestamp : null;
      const unreadCount = chat.wa_unreadCount || 0;
      // Get avatar from chat data (imagePreview is smaller/faster)
      const avatarUrl = chat.imagePreview || chat.image || null;
      const lastMsgPreview = chat.wa_lastMessageTextVote || null;

      const { data: existing } = await supabase
        .from("whatsapp_conversations")
        .select("id, contact_name, avatar_url")
        .eq("phone_number", phone)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase.from("whatsapp_conversations").insert({
          phone_number: phone,
          contact_name: contactName,
          status: "active",
          last_message_at: validTimestamp,
          unread_count: unreadCount,
          last_message_preview: lastMsgPreview,
          avatar_url: avatarUrl,
        });
        if (insertError) {
          console.error(`[UAZAPI Sync] Insert error for ${phone}:`, JSON.stringify(insertError));
        } else {
          syncedCount++;
        }
      } else {
        const updates: Record<string, unknown> = {};
        if (contactName && contactName !== existing.contact_name) updates.contact_name = contactName;
        if (validTimestamp) updates.last_message_at = validTimestamp;
        if (unreadCount > 0) updates.unread_count = unreadCount;
        if (lastMsgPreview) updates.last_message_preview = lastMsgPreview;
        if (avatarUrl && avatarUrl !== existing.avatar_url) updates.avatar_url = avatarUrl;

        if (Object.keys(updates).length > 0) {
          await supabase.from("whatsapp_conversations").update(updates).eq("id", existing.id);
          updatedCount++;
        }
      }
    }
  }

  return {
    success: true,
    total: Array.isArray(chats) ? chats.length : 0,
    synced: syncedCount,
    updated: updatedCount,
    pagination: result.pagination || null,
  };
}

// ========== SYNC MESSAGES ==========
async function syncMessages(supabase: any, token: string, phone: string, limit: number) {
  if (!phone) return jsonResponse({ success: false, error: "Número não informado" }, 400);
  const result = await syncMessagesInternal(supabase, token, phone, limit);
  return jsonResponse(result);
}

async function syncMessagesInternal(supabase: any, token: string, phone: string, limit: number) {
  const phoneClean = phone.replace(/\D/g, "");
  const chatid = `${phoneClean}@s.whatsapp.net`;

  const response = await fetch(`${UAZAPI_SERVER_URL}/message/find`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ chatid, limit, offset: 0 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[UAZAPI Sync] Error fetching messages:", errorText);
    return { success: false, error: "Falha ao buscar mensagens", imported: 0 };
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
    return { success: false, error: "Falha ao criar conversa", imported: 0 };
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

      const content = msg.text || msg.convertOptions || extractContentFromType(msg);
      const direction = msg.fromMe ? "outbound" : "inbound";
      const messageType = mapMessageType(msg.messageType || "text");
      const mediaUrl = msg.fileURL || null;
      const caption = msg.caption || null;
      const timestamp = msg.messageTimestamp
        ? new Date(msg.messageTimestamp > 9999999999 ? msg.messageTimestamp : msg.messageTimestamp * 1000).toISOString()
        : new Date().toISOString();

      const { error } = await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        uazapi_message_id: msgId,
        direction,
        content: content || "[mídia]",
        message_type: messageType,
        media_url: mediaUrl,
        caption,
        status: direction === "outbound" ? "sent" : "received",
        created_at: timestamp,
        sender_phone: msg.sender?.replace("@s.whatsapp.net", "") || (msg.fromMe ? "system" : phoneClean),
        recipient_phone: msg.fromMe ? phoneClean : "system",
      });

      if (!error) importedCount++;
    }

    // Update conversation last message
    if (messages.length > 0) {
      const lastMsg = messages[0];
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: lastMsg.messageTimestamp
            ? new Date(lastMsg.messageTimestamp > 9999999999 ? lastMsg.messageTimestamp : lastMsg.messageTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          last_message_preview: (lastMsg.text || "[mídia]").substring(0, 100),
          last_message_from: lastMsg.fromMe ? "system" : "customer",
        })
        .eq("id", conversation.id);
    }
  }

  return {
    success: true,
    conversationId: conversation.id,
    total: Array.isArray(messages) ? messages.length : 0,
    imported: importedCount,
  };
}

// ========== FETCH PROFILE PICTURE ==========
async function fetchProfilePicture(supabase: any, token: string, phone: string) {
  if (!phone) return jsonResponse({ success: false, error: "Número não informado" }, 400);

  const avatarUrl = await fetchAvatarUrl(token, phone);

  if (avatarUrl) {
    // Update conversation avatar
    const phoneClean = phone.replace(/\D/g, "");
    await supabase
      .from("whatsapp_conversations")
      .update({ avatar_url: avatarUrl })
      .eq("phone_number", phoneClean);
  }

  return jsonResponse({ success: true, avatarUrl });
}

async function fetchAvatarUrl(token: string, phone: string): Promise<string | null> {
  try {
    const phoneClean = phone.replace(/\D/g, "");
    
    // UAZAPI v2: POST /chat/details with preview=true for smaller image
    const response = await fetch(`${UAZAPI_SERVER_URL}/chat/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: phoneClean, preview: true }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.imagePreview || data.image || null;
  } catch (err) {
    console.error(`[UAZAPI Sync] Error fetching avatar for ${phone}:`, err);
    return null;
  }
}

// ========== HELPERS ==========
function mapMessageType(type: string): string {
  const map: Record<string, string> = {
    conversation: "text",
    extendedTextMessage: "text",
    imageMessage: "image",
    image: "image",
    documentMessage: "document",
    document: "document",
    audioMessage: "audio",
    audio: "audio",
    ptt: "audio",
    videoMessage: "video",
    video: "video",
    stickerMessage: "sticker",
    sticker: "sticker",
    locationMessage: "location",
    location: "location",
    contactMessage: "contact",
    contact: "contact",
  };
  return map[type] || "text";
}

function extractContentFromType(msg: any): string {
  const type = msg.messageType || "";
  if (type.includes("image")) return msg.caption || "[Imagem]";
  if (type.includes("document")) return msg.caption || msg.fileName || "[Documento]";
  if (type.includes("audio") || type === "ptt") return "[Áudio]";
  if (type.includes("video")) return msg.caption || "[Vídeo]";
  if (type.includes("sticker")) return "[Figurinha]";
  if (type.includes("location")) return "[Localização]";
  if (type.includes("contact")) return "[Contato]";
  return "";
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
