

## Diagnóstico e Plano de Correção - WhatsApp & Mensagens

### Problemas Identificados

1. **Mensagens duplicadas**: O `langgraph-agent` insere mensagem outbound na tabela `whatsapp_messages` (linha 1073-1083) E depois chama `send-whatsapp-message` que TAMBÉM insere na mesma tabela (linha 180-193). Resultado: cada resposta do bot aparece **2x** no chat.

2. **Labels de intent desincronizados**: O `getIntentLabel()` no AtendimentoPage usa nomes antigos (`quer_boleto`, `negociacao`, `comprovante`) mas o langgraph-agent salva os novos (`request_boleto`, `request_negotiation`, `upload_proof`). Os badges de intent nunca aparecem corretamente.

3. **Conversas não relacionam `units` corretamente**: A query `loadConversations` usa `units` (singular join) mas o select retorna como array em alguns casos, gerando problemas de tipo.

---

### Correções Planejadas

#### 1. Remover inserção duplicada no `langgraph-agent`
- Na função `sendWhatsAppMessage` do langgraph-agent, **remover** o insert em `whatsapp_messages` e o update em `whatsapp_conversations`, pois `send-whatsapp-message` já faz isso.

#### 2. Atualizar labels de intent no AtendimentoPage
- Mapear os nomes corretos do agent: `request_boleto`, `request_negotiation`, `confirm_payment`, `payment_intent`, `ask_question`, `upload_proof`, `dispute`, `request_human`, `general`.

#### 3. Verificar e corrigir fluxo completo
- Garantir que o webhook recebe, salva, invoca agent, agent processa, responde, e tudo aparece 1x no chat.
- Corrigir o `sendWhatsAppMessage` para apenas invocar a edge function e não duplicar registros.

---

### Arquivos Alterados

| Arquivo | Alteração |
|---|---|
| `supabase/functions/langgraph-agent/index.ts` | Remover inserção duplicada de mensagens |
| `src/pages/AtendimentoPage.tsx` | Corrigir mapa de intent labels |

### Sobre a última atualização
O sistema WhatsApp foi estruturado com UAZAPI v2, LangGraph agent com Lovable AI (Gemini 2.5 Flash), detecção de 9 intenções, pipeline CRM automático, e ações de operador funcionais. As edge functions `uazapi-webhook`, `langgraph-agent`, `send-whatsapp-message` estão todas integradas e deployadas.

