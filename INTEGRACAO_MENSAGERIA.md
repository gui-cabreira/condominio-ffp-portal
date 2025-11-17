# 📱 Integração Completa de Mensageria - UAZAPI + Resend

## 🚀 Guia Definitivo de Configuração e Uso

Data: 17/11/2025

---

## 📋 VISÃO GERAL

Sistema completo de comunicação multi-canal com condôminos:
- ✅ **WhatsApp** via UAZAPI (envio e recebimento)
- ✅ **Email** via Resend (envio com templates)
- ✅ **SMS** (estrutura pronta, implementação futura)
- ✅ **IA Conversacional** (LangGraph Agent)

---

## 📱 PARTE 1: INTEGRAÇÃO COM UAZAPI (WhatsApp)

### 🔧 O que é UAZAPI?

UAZAPI é uma API de WhatsApp que permite:
- Enviar mensagens de texto, imagens, documentos, áudio, vídeo
- Receber mensagens via webhook
- Rastrear status de entrega (sent, delivered, read)
- Gerenciar múltiplas instâncias

### 📝 Configuração Inicial

#### 1. Criar Conta no UAZAPI

1. Acesse: https://uazapi.com
2. Crie sua conta
3. Crie uma instância (representa um número de WhatsApp)
4. Anote:
   - **Instance ID** (identificador da instância)
   - **API Token** (token de autenticação)

#### 2. Configurar Webhook no UAZAPI

No painel do UAZAPI:
1. Vá em **Configurações da Instância**
2. Defina **Webhook URL**:
   ```
   https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/uazapi-webhook
   ```
3. Eventos para ativar:
   - ✅ `message.received` - Quando receber mensagem
   - ✅ `message.status` - Quando status mudar (delivered, read)
   - ✅ `connection.update` - Quando conexão mudar

#### 3. Configurar Secrets no Supabase

```bash
supabase secrets set UAZAPI_INSTANCE_ID=sua-instance-id-aqui
supabase secrets set UAZAPI_TOKEN=seu-token-aqui
# OU
supabase secrets set UAZAPI_API_KEY=seu-token-aqui
```

---

### 📤 ENVIO DE MENSAGENS

#### API Endpoint do UAZAPI

```
POST https://api.uazapi.com/v1/instance/send
Headers:
  Content-Type: application/json
  Authorization: Bearer {UAZAPI_TOKEN}
```

#### Payload para Mensagem de Texto

```json
{
  "sessionId": "sua-instance-id",
  "to": "5511999999999@s.whatsapp.net",
  "type": "text",
  "text": {
    "message": "Olá! Você tem uma cobrança pendente."
  }
}
```

#### Payload para Mensagem com Imagem

```json
{
  "sessionId": "sua-instance-id",
  "to": "5511999999999@s.whatsapp.net",
  "type": "image",
  "image": {
    "url": "https://exemplo.com/boleto.png",
    "caption": "Segue o boleto para pagamento"
  }
}
```

#### Payload para Documento

```json
{
  "sessionId": "sua-instance-id",
  "to": "5511999999999@s.whatsapp.net",
  "type": "document",
  "document": {
    "url": "https://exemplo.com/contrato.pdf",
    "caption": "Contrato de prestação de serviços"
  }
}
```

---

### 📥 RECEBIMENTO DE MENSAGENS (Webhook)

#### Evento: message.received

**URL que recebe:** `/functions/v1/uazapi-webhook`

**Payload de Exemplo:**

```json
{
  "event": "message.received",
  "instanceId": "sua-instance-id",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0XXXXXXXXXXXXX"
    },
    "messageTimestamp": "1700000000",
    "pushName": "João Silva",
    "message": {
      "conversation": "Oi, preciso de um boleto"
    }
  }
}
```

**Campos Principais:**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `event` | Tipo do evento | `message.received` |
| `data.key.remoteJid` | Número do remetente | `5511999999999@s.whatsapp.net` |
| `data.key.fromMe` | Se foi enviado por nós | `false` |
| `data.pushName` | Nome do contato | `João Silva` |
| `data.message.conversation` | Texto da mensagem | `Oi, preciso de um boleto` |

#### Mensagem com Imagem

```json
{
  "event": "message.received",
  "data": {
    "message": {
      "imageMessage": {
        "url": "https://mmg.whatsapp.net/...",
        "mimetype": "image/jpeg",
        "caption": "Segue o comprovante",
        "fileLength": "125420"
      }
    }
  }
}
```

#### Mensagem com Documento

```json
{
  "event": "message.received",
  "data": {
    "message": {
      "documentMessage": {
        "url": "https://mmg.whatsapp.net/...",
        "mimetype": "application/pdf",
        "title": "comprovante.pdf",
        "pageCount": 1,
        "fileLength": "84520"
      }
    }
  }
}
```

---

### 📊 EVENTOS DE STATUS

#### Evento: message.status

**Payload de Exemplo:**

```json
{
  "event": "message.status",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "3EB0XXXXXXXXXXXXX"
    },
    "status": "DELIVERED"
  }
}
```

**Status Possíveis:**

| Status | Significado |
|--------|-------------|
| `SENT` | Mensagem enviada |
| `DELIVERED` | Mensagem entregue ao destinatário |
| `READ` | Mensagem lida pelo destinatário |
| `FAILED` | Falha no envio |

---

### 🔄 FLUXO COMPLETO NO SISTEMA

#### 1. Disparo de Cobrança (Proativo)

```typescript
// Via Edge Function: send-charge-notification
POST /functions/v1/send-charge-notification

Body:
{
  "chargeId": "uuid-da-cobranca",
  "channel": "whatsapp", // ou "email", "sms", "all"
  "templateMessage": "Olá {nome}! Você possui uma cobrança de {valor}..."
}

Fluxo:
1. Busca dados da cobrança
2. Formata mensagem com variáveis
3. Invoca send-whatsapp-message
4. send-whatsapp-message chama API do UAZAPI
5. Salva mensagem no banco (whatsapp_messages)
6. Registra no timeline (charge_timeline)
```

#### 2. Recebimento de Resposta (Reativo)

```typescript
// Webhook do UAZAPI
POST /functions/v1/uazapi-webhook

Fluxo:
1. UAZAPI envia payload para webhook
2. uazapi-webhook processa payload
3. Salva mensagem em whatsapp_messages
4. Cria/atualiza conversa em whatsapp_conversations
5. Invoca langgraph-agent com contexto
6. langgraph-agent:
   - Busca dados do condômino (unidade, cobranças)
   - Identifica intenção com IA (GPT-4)
   - Executa ação (ex: gerar boleto, propor parcelamento)
   - Gera resposta contextual
   - Invoca send-whatsapp-message para responder
7. send-whatsapp-message envia resposta via UAZAPI
8. Atualiza timeline da cobrança
```

#### 3. Diagrama Visual

```
┌─────────────────────────────────────────────────────────┐
│ CONDÔMINO (WhatsApp)                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1. Recebe cobrança
                 ↓
         [UAZAPI Instance]
                 │
                 │ 2. Webhook POST
                 ↓
┌─────────────────────────────────────────────────────────┐
│ uazapi-webhook (Edge Function)                          │
│ - Salva mensagem                                        │
│ - Cria/atualiza conversa                               │
│ - Invoca LangGraph Agent                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 3. Processar com IA
                 ↓
┌─────────────────────────────────────────────────────────┐
│ langgraph-agent (Edge Function)                         │
│ - Busca contexto (unidade, cobranças, histórico)       │
│ - Identifica intenção (GPT-4)                          │
│ - Executa ação (gerar boleto, parcelar, etc)          │
│ - Gera resposta                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 4. Enviar resposta
                 ↓
┌─────────────────────────────────────────────────────────┐
│ send-whatsapp-message (Edge Function)                   │
│ - Formata payload UAZAPI                               │
│ - POST para API UAZAPI                                 │
│ - Salva mensagem enviada                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 5. Entrega ao condômino
                 ↓
         [UAZAPI Instance]
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ CONDÔMINO (WhatsApp)                                    │
│ Recebe resposta automática                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 PARTE 2: INTEGRAÇÃO COM RESEND (Email)

### 🔧 O que é Resend?

Resend é um serviço moderno de envio de emails com:
- API simples e confiável
- Rastreamento de entregas
- Webhooks para eventos (delivered, opened, clicked)
- Templates HTML

### 📝 Configuração Inicial

#### 1. Criar Conta no Resend

1. Acesse: https://resend.com
2. Crie sua conta
3. Adicione e verifique seu domínio
4. Anote a **API Key**

#### 2. Configurar DNS do Domínio

Adicione os registros DNS fornecidos pelo Resend:

```
SPF: v=spf1 include:resend.com ~all
DKIM: [fornecido pelo Resend]
DMARC: v=DMARC1; p=none; rua=mailto:dmarc@seudomain.com
```

#### 3. Configurar Secret no Supabase

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

---

### 📤 ENVIO DE EMAILS

#### Via Edge Function: send-workflow-email

```typescript
POST /functions/v1/send-workflow-email

Body:
{
  "to": "cliente@exemplo.com",
  "subject": "Cobrança Pendente - Condomínio ABC",
  "message": "Olá {nome}!\n\nVocê possui uma cobrança de {valor}...",
  "chargeData": {
    "owner_name": "João Silva",
    "amount": 500.00,
    "due_date": "2024-01-15",
    "unit_number": "101",
    "condominium_name": "Residencial ABC"
  }
}

Response:
{
  "success": true,
  "emailId": "re_abc123xyz",
  "stepId": "uuid-do-step"
}
```

#### Variáveis Suportadas

| Variável | Substituído por | Exemplo |
|----------|-----------------|---------|
| `{nome}` | Nome do proprietário | João Silva |
| `{valor}` | Valor formatado | R$ 500,00 |
| `{vencimento}` | Data formatada | 15/01/2024 |
| `{unidade}` | Número da unidade | 101 |
| `{condominio}` | Nome do condomínio | Residencial ABC |
| `{dias_atraso}` | Dias em atraso | 5 |
| `{link_pagamento}` | Link de pagamento | https://... |

---

### 📥 WEBHOOKS DO RESEND

#### Configurar Webhook

No painel do Resend:
1. Vá em **Webhooks**
2. Adicione webhook URL:
   ```
   https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/resend-webhook
   ```
3. Selecione eventos:
   - ✅ `email.delivered`
   - ✅ `email.opened`
   - ✅ `email.clicked`
   - ✅ `email.bounced`
   - ✅ `email.complained`

#### Eventos Recebidos

**email.delivered:**
```json
{
  "type": "email.delivered",
  "created_at": "2024-01-01T10:00:00.000Z",
  "data": {
    "email_id": "re_abc123xyz",
    "from": "notificacao@ffpadvogados.com.br",
    "to": ["cliente@exemplo.com"],
    "subject": "Cobrança Pendente"
  }
}
```

**email.opened:**
```json
{
  "type": "email.opened",
  "created_at": "2024-01-01T10:05:00.000Z",
  "data": {
    "email_id": "re_abc123xyz"
  }
}
```

---

## 🎯 PARTE 3: EDGE FUNCTIONS CRIADAS

### 1. send-whatsapp-message

**Arquivo:** `supabase/functions/send-whatsapp-message/index.ts`

**Função:** Envia mensagens via UAZAPI

**Input:**
```typescript
{
  phone: string;          // 5511999999999
  message: string;        // Texto da mensagem
  conversationId?: string;// UUID da conversa (opcional)
  chargeId?: string;      // UUID da cobrança (opcional)
  mediaUrl?: string;      // URL de mídia (opcional)
  mediaType?: 'image' | 'document' | 'audio' | 'video';
}
```

**Output:**
```typescript
{
  success: boolean;
  messageId: string;      // ID da mensagem no UAZAPI
  conversationId: string; // UUID da conversa
  result: any;            // Resposta completa do UAZAPI
}
```

---

### 2. send-charge-notification

**Arquivo:** `supabase/functions/send-charge-notification/index.ts`

**Função:** Dispara notificação de cobrança multi-canal

**Input:**
```typescript
{
  chargeId: string;           // UUID da cobrança
  channel: 'email' | 'whatsapp' | 'sms' | 'all';
  templateMessage?: string;   // Template customizado (opcional)
}
```

**Output:**
```typescript
{
  success: boolean;
  chargeId: string;
  channel: string;
  results: {
    email: { success: boolean; data?: any; error?: string };
    whatsapp: { success: boolean; data?: any; error?: string };
    sms: { success: boolean; data?: any; error?: string };
  };
  summary: {
    sent: number;    // Canais com sucesso
    failed: number;  // Canais com falha
    total: number;   // Total de tentativas
  };
}
```

---

### 3. uazapi-webhook

**Arquivo:** `supabase/functions/uazapi-webhook/index.ts`

**Função:** Recebe webhooks do UAZAPI e processa

**Fluxo:**
1. Recebe payload do UAZAPI
2. Loga em `whatsapp_webhooks_log`
3. Processa baseado no tipo de evento:
   - `message.received`: Salva mensagem, invoca agent
   - `message.status`: Atualiza status da mensagem
   - `connection.update`: Registra mudança de conexão
4. Marca webhook como processado

---

### 4. langgraph-agent

**Arquivo:** `supabase/functions/langgraph-agent/index.ts`

**Função:** Agente IA para processar mensagens e responder

**Input:**
```typescript
{
  conversationId: string;
  phone: string;
  message: string;
  messageType: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  intent: string;      // Intenção identificada
  response: string;    // Resposta gerada
  action: string;      // Ação executada
}
```

**Intenções Identificadas:**
- `request_boleto` - Solicitar boleto
- `request_negotiation` - Pedir parcelamento
- `confirm_payment` - Informar pagamento
- `ask_question` - Fazer pergunta
- `upload_proof` - Enviar comprovante
- `dispute` - Contestar cobrança
- `general` - Conversa geral

---

### 5. send-workflow-email

**Arquivo:** `supabase/functions/send-workflow-email/index.ts`

**Função:** Envia emails via Resend

**Input:**
```typescript
{
  to: string | string[];
  subject: string;
  message: string;
  chargeData?: object;   // Dados para substituir variáveis
  stepId?: string;       // ID do step do workflow
}
```

---

## 🧪 TESTES

### Testar Envio de WhatsApp

```bash
curl -X POST https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/send-whatsapp-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -d '{
    "phone": "5511999999999",
    "message": "Teste de mensagem do sistema FFP!"
  }'
```

### Testar Disparo de Cobrança

```bash
curl -X POST https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/send-charge-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -d '{
    "chargeId": "uuid-da-cobranca",
    "channel": "all"
  }'
```

### Simular Webhook do UAZAPI

```bash
curl -X POST https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/uazapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "instanceId": "sua-instance-id",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "test123"
      },
      "message": {
        "conversation": "Oi, preciso de um boleto"
      }
    }
  }'
```

---

## 📊 MONITORAMENTO

### Queries Úteis

**Mensagens WhatsApp recentes:**
```sql
SELECT
  wm.created_at,
  wm.direction,
  wm.content,
  wm.status,
  wc.phone_number,
  u.unit_number
FROM whatsapp_messages wm
JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
LEFT JOIN units u ON wc.unit_id = u.id
ORDER BY wm.created_at DESC
LIMIT 50;
```

**Taxa de resposta do Agent:**
```sql
SELECT
  COUNT(*) FILTER (WHERE direction = 'inbound') AS received,
  COUNT(*) FILTER (WHERE direction = 'outbound') AS sent,
  ROUND(
    COUNT(*) FILTER (WHERE direction = 'outbound')::NUMERIC /
    COUNT(*) FILTER (WHERE direction = 'inbound')::NUMERIC * 100,
    2
  ) AS response_rate_percent
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Emails enviados por status:**
```sql
SELECT
  status,
  COUNT(*) AS total
FROM messages
WHERE type = 'email'
  AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## 🔐 SEGURANÇA

### Validar Webhook do UAZAPI

```typescript
// No webhook, adicionar verificação
const webhookSecret = Deno.env.get('UAZAPI_WEBHOOK_SECRET');
const signature = req.headers.get('x-uazapi-signature');

if (webhookSecret && signature) {
  // Validar assinatura
  const isValid = validateSignature(payload, signature, webhookSecret);
  if (!isValid) {
    throw new Error('Invalid webhook signature');
  }
}
```

### Rate Limiting

Configurar no UAZAPI:
- Máximo de 100 mensagens por minuto
- Máximo de 10.000 mensagens por dia

---

## 💰 CUSTOS ESTIMADOS

| Serviço | Plano | Custo Mensal | Volume |
|---------|-------|--------------|--------|
| **UAZAPI** | Básico | $30-50 | 5.000 msgs |
| **Resend** | Free | $0 | 3.000 emails |
| **Resend** | Pro | $20 | 50.000 emails |
| **OpenAI** | API | ~$10 | IA do Agent |
| **TOTAL** | - | **$40-80/mês** | - |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Criar send-whatsapp-message function
- [x] Criar send-charge-notification function
- [x] Atualizar langgraph-agent para enviar respostas
- [x] Documentar payloads do UAZAPI
- [ ] Configurar UAZAPI_INSTANCE_ID e TOKEN
- [ ] Configurar webhook no painel do UAZAPI
- [ ] Testar envio de mensagem
- [ ] Testar recebimento e resposta automática
- [ ] Configurar RESEND_API_KEY
- [ ] Verificar domínio no Resend
- [ ] Configurar webhook do Resend
- [ ] Testar envio de email
- [ ] Integrar com workflows de cobrança

---

## 📞 SUPORTE

**UAZAPI:**
- Documentação: https://docs.uazapi.com
- Suporte: support@uazapi.com

**Resend:**
- Documentação: https://resend.com/docs
- Suporte: support@resend.com

---

**Desenvolvido com ❤️ para FFP Portal**
**A comunicação mais eficiente com seus condôminos!**
