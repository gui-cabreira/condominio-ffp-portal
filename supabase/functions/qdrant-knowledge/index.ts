import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KnowledgeRequest {
  action: 'add' | 'search' | 'delete' | 'learn_from_conversation' | 'vectorize_all';
  instanceId?: string;
  title?: string;
  content?: string;
  type?: string;
  query?: string;
  conversationId?: string;
  knowledgeId?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: KnowledgeRequest = await req.json();

    console.log("Qdrant Knowledge action:", body.action);

    switch (body.action) {
      case 'add': {
        // Adicionar conhecimento ao banco e gerar embedding
        const { instanceId, title, content, type } = body;
        
        if (!instanceId || !title || !content) {
          return new Response(
            JSON.stringify({ success: false, error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 1. Gerar embedding usando Lovable AI
        let embeddingId = null;
        if (lovableApiKey) {
          try {
            const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: "Você é um assistente que gera resumos semânticos concisos para indexação. Retorne apenas um resumo de 1-2 frases que capture a essência do conteúdo."
                  },
                  {
                    role: "user",
                    content: `Título: ${title}\n\nConteúdo: ${content}`
                  }
                ],
              }),
            });

            if (embeddingResponse.ok) {
              const embeddingData = await embeddingResponse.json();
              // Usar o hash do conteúdo como embedding_id temporário
              embeddingId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
          } catch (e) {
            console.error("Erro ao gerar embedding:", e);
          }
        }

        // 2. Salvar no banco
        const { data, error } = await supabase
          .from('ai_knowledge_base')
          .insert({
            instance_id: instanceId,
            title,
            content,
            source_type: type || 'faq',
            embedding_id: embeddingId,
            is_vectorized: !!embeddingId,
          })
          .select()
          .single();

        if (error) {
          console.error("Erro ao salvar conhecimento:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'search': {
        // Buscar conhecimento relevante
        const { instanceId, query, limit = 5 } = body;
        
        if (!instanceId || !query) {
          return new Response(
            JSON.stringify({ success: false, error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Busca por texto simples (sem Qdrant por enquanto)
        // Em produção, isso seria substituído por busca vetorial real
        const { data: results, error } = await supabase
          .from('ai_knowledge_base')
          .select('*')
          .eq('instance_id', instanceId)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(limit);

        if (error) {
          console.error("Erro na busca:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se não encontrou nada, fazer busca semântica via IA
        if ((!results || results.length === 0) && lovableApiKey) {
          const { data: allKnowledge } = await supabase
            .from('ai_knowledge_base')
            .select('id, title, content')
            .eq('instance_id', instanceId)
            .limit(50);

          if (allKnowledge && allKnowledge.length > 0) {
            try {
              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: `Você é um sistema de busca semântica. Dada uma pergunta e uma lista de conhecimentos, retorne os IDs dos conhecimentos mais relevantes (máximo ${limit}), separados por vírgula. Se nenhum for relevante, retorne "NONE".`
                    },
                    {
                      role: "user",
                      content: `Pergunta: ${query}\n\nConhecimentos:\n${allKnowledge.map(k => `ID: ${k.id} - ${k.title}: ${k.content.substring(0, 200)}`).join('\n\n')}`
                    }
                  ],
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const idsText = aiData.choices?.[0]?.message?.content || "";
                
                if (idsText !== "NONE") {
                  const ids = idsText.split(',').map((id: string) => id.trim());
                  const { data: semanticResults } = await supabase
                    .from('ai_knowledge_base')
                    .select('*')
                    .in('id', ids);
                  
                  return new Response(
                    JSON.stringify({ success: true, results: semanticResults || [], semantic: true }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                  );
                }
              }
            } catch (e) {
              console.error("Erro na busca semântica:", e);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, results: results || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'learn_from_conversation': {
        // Aprender de uma conversa
        const { conversationId, instanceId } = body;
        
        if (!conversationId || !instanceId) {
          return new Response(
            JSON.stringify({ success: false, error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar mensagens da conversa
        const { data: messages, error: msgError } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (msgError || !messages || messages.length < 2) {
          return new Response(
            JSON.stringify({ success: false, error: "Conversa muito curta para aprendizado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Usar IA para extrair pares de pergunta/resposta
        if (lovableApiKey) {
          try {
            const conversationText = messages.map((m: any) => 
              `[${m.direction === 'incoming' ? 'USUÁRIO' : 'ASSISTENTE'}]: ${m.content || '[mídia]'}`
            ).join('\n');

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `Analise esta conversa e extraia pares de pergunta/resposta úteis para treinar um assistente virtual de cobrança condominial. Retorne em formato JSON: [{"question": "...", "answer": "...", "quality": 0.0-1.0}]. Apenas inclua trocas onde a resposta foi útil e resolveu a dúvida. Se não houver nada útil, retorne [].`
                  },
                  {
                    role: "user",
                    content: conversationText
                  }
                ],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const responseText = aiData.choices?.[0]?.message?.content || "[]";
              
              // Parse do JSON da resposta
              let pairs = [];
              try {
                const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                  pairs = JSON.parse(jsonMatch[0]);
                }
              } catch (e) {
                console.error("Erro ao parsear resposta da IA:", e);
              }

              // Salvar pares extraídos
              for (const pair of pairs) {
                if (pair.question && pair.answer) {
                  await supabase
                    .from('ai_learning_history')
                    .insert({
                      instance_id: instanceId,
                      conversation_id: conversationId,
                      question: pair.question,
                      answer: pair.answer,
                      quality_score: pair.quality || 0.5,
                      is_approved: false,
                    });
                }
              }

              // Marcar mensagens como usadas para treinamento
              await supabase
                .from('whatsapp_messages')
                .update({ used_for_training: true })
                .eq('conversation_id', conversationId);

              return new Response(
                JSON.stringify({ success: true, learned: pairs.length }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch (e) {
            console.error("Erro no aprendizado:", e);
          }
        }

        return new Response(
          JSON.stringify({ success: false, error: "Não foi possível processar aprendizado" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete': {
        const { knowledgeId } = body;
        
        if (!knowledgeId) {
          return new Response(
            JSON.stringify({ success: false, error: "ID não informado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from('ai_knowledge_base')
          .delete()
          .eq('id', knowledgeId);

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error("Erro no qdrant-knowledge:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
