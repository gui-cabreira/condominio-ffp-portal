# 🚀 Novas Funcionalidades - Portal Condomínio FFP

## Data de Implementação: 17/11/2025

---

## 📋 Resumo Executivo

Foram implementadas duas funcionalidades críticas para o Portal FFP:

1. **Integração Automática com Administradoras** - Sistema completo de sincronização de dados
2. **LangGraph Agent para WhatsApp** - Atendimento inteligente com IA

---

## 🔄 1. INTEGRAÇÃO AUTOMÁTICA COM ADMINISTRADORAS

### Descrição
Sistema completo para sincronizar automaticamente dados das administradoras (Superlógica, etc.) com o portal FFP, eliminando a necessidade de importação manual via CSV.

### Arquivos Criados/Modificados

#### Migração SQL
- **`supabase/migrations/20251117000001_create_administrator_sync_tables.sql`**
  - Tabela `administrator_sync_logs` - Logs de sincronização
  - Tabela `administrator_sync_config` - Configurações de sincronização por administradora
  - Tabela `management_system_templates` - Templates de scraping/parsing por sistema
  - Colunas adicionadas em `administrators` para rastreamento

#### Edge Functions
- **`supabase/functions/sync-administrator-data/index.ts`**
  - Função principal de sincronização
  - Suporta API, scraping web e processamento com IA
  - Processa e salva dados (condomínios, unidades, cobranças)

- **`supabase/functions/process-administrator-syncs/index.ts`**
  - Cron job para executar sincronizações agendadas
  - Processa múltiplas administradoras em lote
  - Envia notificações de sucesso/erro

#### UI/Frontend
- **`src/pages/AdministratorSync.tsx`**
  - Interface completa para gerenciar sincronizações
  - Configuração de sincronização automática
  - Visualização de logs e estatísticas
  - Execução manual de sincronizações

- **`src/App.tsx`**
  - Nova rota: `/portal/corporativo/sincronizacao`

#### Configuração
- **`supabase/config.toml`**
  - Adicionadas configurações para as novas Edge Functions

---

### Como Funciona

#### Fluxo de Sincronização

```
┌─────────────────────────────────────────────────────┐
│ ADMINISTRADORA (Superlógica, etc.)                  │
│ - Portal Web                                        │
│ - API (se disponível)                               │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ (1) Login automático
                  │ (2) Navegação e extração de dados
                  │ (3) Parsing inteligente
                  ↓
┌─────────────────────────────────────────────────────┐
│ EDGE FUNCTION: sync-administrator-data              │
│ - Autentica no portal                               │
│ - Extrai dados (HTML/JSON/API)                      │
│ - Parseia com template ou IA                        │
│ - Valida e estrutura dados                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────┐
│ PROCESSAMENTO E SALVAMENTO                          │
│ - Cria/atualiza Condomínios                         │
│ - Cria/atualiza Unidades                            │
│ - Cria/atualiza Cobranças                           │
│ - Registra logs detalhados                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────┐
│ BANCO DE DADOS SUPABASE                             │
│ - Dados sincronizados                               │
│ - Logs de auditoria                                 │
│ - Timeline de eventos                               │
└─────────────────────────────────────────────────────┘
```

#### Sincronização Agendada (Cron)

```
⏰ Horário configurado (ex: 03:00 AM)
  ↓
process-administrator-syncs (Edge Function)
  ↓
Busca todas as configurações com auto_sync_enabled = true
  ↓
Para cada administradora:
  ├─ Invoca sync-administrator-data
  ├─ Aguarda conclusão
  ├─ Envia notificação (se configurado)
  └─ Calcula próximo horário de sincronização
```

---

### Funcionalidades Implementadas

#### ✅ Múltiplos Métodos de Autenticação
- **Credenciais** (usuário/senha)
- **API Key** (quando disponível)
- **Web Scraping** (fallback)

#### ✅ Parsing Inteligente
- Templates configuráveis por sistema de gestão
- Seletores CSS/XPath para extração de dados
- Processamento com IA (GPT) quando parsing tradicional falha

#### ✅ Sincronização Automática
- Frequências: Hourly, Daily, Weekly
- Horário customizável
- Próxima execução calculada automaticamente

#### ✅ Logs Detalhados
- Status de cada sincronização (completed, failed, partial)
- Estatísticas:
  - Novos condomínios criados
  - Unidades criadas/atualizadas
  - Cobranças importadas
  - Erros encontrados
- Dados brutos e parseados armazenados

#### ✅ Notificações
- Email em caso de erro (configurável)
- Email em caso de sucesso (opcional)
- Templates HTML com estatísticas

#### ✅ UI Intuitiva
- Dashboard com resumo geral
- Cards individuais por administradora
- Botão de sincronização manual
- Configuração fácil de automação
- Visualização de histórico de logs

---

### Como Usar

#### 1. Configurar Credenciais da Administradora

Vá em **Administradoras** e preencha:
- Link do Portal
- Usuário
- Senha
- Sistema de Gestão (ex: Superlógica)

#### 2. Configurar Sincronização

Acesse **Sincronização** (`/portal/corporativo/sincronizacao`):

1. Clique em **Configurar** na administradora desejada
2. Ative **Sincronização Automática**
3. Escolha a frequência (Hourly/Daily/Weekly)
4. Defina o horário (se Daily ou Weekly)
5. Configure notificações
6. Salve

#### 3. Executar Sincronização Manual

- Clique em **Sincronizar** no card da administradora
- Aguarde o processamento
- Veja os resultados no toast de notificação

#### 4. Visualizar Logs

- Clique em **Logs** para ver histórico completo
- Veja estatísticas de cada execução
- Identifique erros e corrija

---

### Templates de Scraping

Exemplo de template para Superlógica:

```json
{
  "login_url": "https://portal.superlogica.net/login",
  "charges_url": "https://portal.superlogica.net/financeiro/inadimplentes",
  "login_form_selectors": {
    "username": "input[name='username']",
    "password": "input[name='password']",
    "submit": "button[type='submit']"
  },
  "data_extraction_rules": {
    "charges": {
      "table_selector": "table.inadimplentes",
      "row_selector": "tbody tr",
      "columns": {
        "condominio": "td:nth-child(1)",
        "unidade": "td:nth-child(2)",
        "proprietario": "td:nth-child(3)",
        "valor": "td:nth-child(4)",
        "vencimento": "td:nth-child(5)"
      }
    }
  },
  "field_mappings": {
    "condominio": "condominium_name",
    "unidade": "unit_number",
    "proprietario": "owner_name",
    "valor": "amount",
    "vencimento": "due_date"
  }
}
```

---

### Estrutura de Dados

#### administrator_sync_logs
```sql
id, administrator_id, sync_type, status, started_at, completed_at,
total_records_fetched, new_condominiums, updated_condominiums,
new_units, updated_units, new_charges, updated_charges, errors_count,
raw_data, parsed_data, errors, metadata
```

#### administrator_sync_config
```sql
id, administrator_id, auto_sync_enabled, sync_frequency, sync_time,
last_sync_at, next_sync_at, auth_type, api_endpoint, api_key,
data_format, parsing_rules, field_mapping, notify_on_success,
notify_on_error, notification_emails, active
```

---

## 🤖 2. LANGGRAPH AGENT PARA WHATSAPP

### Descrição
Agente conversacional inteligente que processa mensagens de condôminos via WhatsApp, identifica intenções, executa ações e responde automaticamente usando IA.

### Arquivos Criados/Modificados

#### Edge Function
- **`supabase/functions/langgraph-agent/index.ts`**
  - Processamento de intenções com IA (GPT-4)
  - 7 tipos de intenção suportados
  - Contexto completo do condômino
  - Respostas personalizadas e ações automatizadas

#### Integração
- **`supabase/functions/uazapi-webhook/index.ts`**
  - Atualizado para invocar o agente automaticamente
  - Descomentado código que estava marcado como TODO

#### Configuração
- **`supabase/config.toml`**
  - Adicionada configuração para langgraph-agent

---

### Como Funciona

#### Fluxo do Agente

```
📱 Condômino envia mensagem WhatsApp
  ↓
UAZAPI Webhook recebe e salva mensagem
  ↓
Invoca langgraph-agent
  ↓
┌─────────────────────────────────────────────────────┐
│ LANGGRAPH AGENT                                     │
├─────────────────────────────────────────────────────┤
│ 1️⃣ BUSCAR CONTEXTO                                  │
│    - Conversa atual                                 │
│    - Unidade do condômino (via telefone)            │
│    - Cobranças pendentes                            │
│    - Histórico de mensagens                         │
│                                                     │
│ 2️⃣ IDENTIFICAR INTENÇÃO (IA)                        │
│    - request_boleto                                 │
│    - request_negotiation                            │
│    - confirm_payment                                │
│    - ask_question                                   │
│    - upload_proof                                   │
│    - dispute                                        │
│    - general                                        │
│                                                     │
│ 3️⃣ EXECUTAR AÇÃO                                    │
│    - Criar solicitação de boleto                    │
│    - Propor parcelamento                            │
│    - Aguardar comprovante                           │
│    - Responder pergunta                             │
│    - Registrar contestação                          │
│                                                     │
│ 4️⃣ GERAR RESPOSTA (IA)                              │
│    - Contextualizada                                │
│    - Empática e profissional                        │
│    - Com emojis apropriados                         │
│    - Máximo 200 caracteres                          │
│                                                     │
│ 5️⃣ ENVIAR RESPOSTA                                  │
│    - Via UAZAPI                                     │
│    - Salvar no banco                                │
│    - Atualizar timeline da cobrança                 │
└─────────────────────────────────────────────────────┘
```

---

### Intenções Suportadas

#### 1. 🧾 request_boleto
**Quando:** Condômino pede novo boleto ou segunda via

**Ações:**
- Cria registro em `boleto_requests`
- Registra no timeline da cobrança
- Agenda geração de boleto

**Resposta:**
> "📄 Sua solicitação de boleto foi registrada! Você receberá um novo boleto em breve."

---

#### 2. 💰 request_negotiation
**Quando:** Condômino pede parcelamento ou desconto

**Ações:**
- Calcula total devido
- Propõe parcelamento (default 3x)
- Aguarda confirmação

**Resposta:**
> "💰 Podemos parcelar sua dívida de R$ 1.500,00 em 3x de R$ 500,00. Aceita?"

---

#### 3. ✅ confirm_payment
**Quando:** Condômino diz que pagou

**Ações:**
- Atualiza conversa para `waiting_proof`
- Aguarda comprovante

**Resposta:**
> "✅ Ótimo! Por favor, envie o comprovante de pagamento para confirmarmos."

---

#### 4. ❓ ask_question
**Quando:** Condômino faz perguntas

**Ações:**
- Busca informações relevantes
- Responde com base nas cobranças

**Resposta:**
> "Você tem 2 cobranças pendentes: R$ 500,00 venc. 15/10 e R$ 500,00 venc. 15/11."

---

#### 5. 📎 upload_proof
**Quando:** Condômino envia comprovante

**Ações:**
- Confirma recebimento
- Agenda análise (manual ou IA)

**Resposta:**
> "📎 Comprovante recebido! Vamos analisar e confirmar seu pagamento em breve."

---

#### 6. ⚠️ dispute
**Quando:** Condômino contesta a cobrança

**Ações:**
- Registra contestação no timeline
- Cria log para análise manual
- Escala para equipe

**Resposta:**
> "⚠️ Sua contestação foi registrada. Nossa equipe analisará e retornará em breve."

---

#### 7. 💬 general
**Quando:** Saudação ou conversa geral

**Ações:**
- Apresenta o assistente
- Oferece opções de ajuda

**Resposta:**
> "👋 Olá! Como posso ajudar? Você pode solicitar boleto, parcelar dívidas ou tirar dúvidas."

---

### Processamento de Intenções com IA

O agente usa **GPT-4 Mini** para identificar intenções:

```typescript
// Prompt do sistema
`Você é um assistente especializado em identificar a intenção de
mensagens de condôminos inadimplentes.

Contexto do condômino:
- Unidade: 101
- Condomínio: Residencial ABC
- Cobranças pendentes: 2
- Total devido: R$ 1.000,00

Identifique a intenção e retorne JSON:
{
  "type": "request_boleto|request_negotiation|...",
  "confidence": 0.0-1.0,
  "entities": {
    "amount": "valor mencionado",
    "date": "data mencionada",
    "installments": "número de parcelas"
  }
}`
```

**Fallback:** Se GPT não disponível, usa regex simples:
- `/boleto|segunda via/i` → request_boleto
- `/parcelar|negociar/i` → request_negotiation
- `/paguei|já paguei/i` → confirm_payment

---

### Geração de Respostas com IA

```typescript
// Prompt do sistema
`Você é um assistente virtual do condomínio [Nome].
Sua função é ajudar condôminos de forma educada e empática.

Informações do condômino:
- Unidade: 101
- Total devido: R$ 1.000,00

Gere uma resposta curta (máximo 200 caracteres).
Use emojis quando apropriado.
Nunca use markdown.`
```

**Fallback:** Se GPT não disponível, usa respostas pré-definidas.

---

### Como Testar

#### 1. Configurar OpenAI API Key

No Supabase, adicione secret:
```bash
API_OPENAI=sk-...
```

#### 2. Enviar Mensagem de Teste

Via UAZAPI ou simulação:

**Teste 1: Solicitar Boleto**
```
Condômino: "Oi, preciso de um boleto"
```

**Resposta esperada:**
```
Bot: "📄 Sua solicitação de boleto foi registrada!
Você receberá um novo boleto em breve."
```

**Teste 2: Pedir Parcelamento**
```
Condômino: "Quero parcelar minha dívida em 6x"
```

**Resposta esperada:**
```
Bot: "💰 Podemos parcelar sua dívida de R$ 1.500,00
em 6x de R$ 250,00. Aceita?"
```

**Teste 3: Informar Pagamento**
```
Condômino: "Já paguei por PIX"
```

**Resposta esperada:**
```
Bot: "✅ Ótimo! Por favor, envie o comprovante de
pagamento para confirmarmos."
```

---

### Logs e Timeline

Todas as interações são registradas:

#### whatsapp_messages
```sql
INSERT INTO whatsapp_messages (
  conversation_id,
  direction,
  content,
  message_type,
  status
)
```

#### charge_timeline
```sql
INSERT INTO charge_timeline (
  charge_id,
  event_type,
  description,
  metadata
)
```

#### whatsapp_conversations
```sql
UPDATE whatsapp_conversations SET
  conversation_state = {
    lastIntent: 'request_boleto',
    lastAction: 'boleto_requested',
    awaiting: null
  }
```

---

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente Necessárias

No Supabase Secrets:

```bash
# OpenAI (obrigatório para IA)
API_OPENAI=sk-proj-...

# UAZAPI (já configurado)
UAZAPI_INSTANCE_ID=...
UAZAPI_WEBHOOK_SECRET=...

# Resend (já configurado)
RESEND_API_KEY=...
```

---

## 🚀 Deploy

### 1. Aplicar Migração SQL

```bash
cd supabase
supabase db push
```

### 2. Deploy Edge Functions

```bash
supabase functions deploy sync-administrator-data
supabase functions deploy process-administrator-syncs
supabase functions deploy langgraph-agent
```

### 3. Configurar Cron Job

No dashboard do Supabase, configure cron job:

```sql
-- Executar sincronizações a cada hora
SELECT cron.schedule(
  'process-administrator-syncs',
  '0 * * * *', -- A cada hora
  $$
  SELECT net.http_post(
    url := 'https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/process-administrator-syncs',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

## 📊 Monitoramento

### Dashboard de Sincronização
- Acesse `/portal/corporativo/sincronizacao`
- Veja status de todas as administradoras
- Execute sincronizações manuais
- Configure automação

### Logs de WhatsApp
- Tabela `whatsapp_messages` - Todas as mensagens
- Tabela `whatsapp_conversations` - Estado das conversas
- Tabela `charge_timeline` - Eventos das cobranças

---

## 🎯 Próximos Passos Sugeridos

### Curto Prazo (1-2 semanas)
1. ✅ **Testar integração com administradoras reais**
   - Validar templates de scraping
   - Ajustar parsing de dados
   - Corrigir erros encontrados

2. ✅ **Treinar e ajustar o LangGraph Agent**
   - Coletar conversas reais
   - Melhorar detecção de intenções
   - Personalizar respostas

3. ✅ **Implementar envio real via UAZAPI**
   - Integrar API de envio
   - Testar entrega de mensagens

### Médio Prazo (3-4 semanas)
4. ✅ **Gateway de Pagamento**
   - Integrar Mercado Pago ou Stripe
   - Geração de PIX
   - Boletos bancários

5. ✅ **Verificação Automática de Comprovantes**
   - OCR com GPT-4 Vision
   - Validação de valores/datas
   - Aprovação automática

### Longo Prazo (1-2 meses)
6. ✅ **Análise Preditiva**
   - ML para prever inadimplência
   - Recomendar estratégias de cobrança

7. ✅ **Mobile App**
   - React Native
   - Push notifications

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no Supabase Dashboard
2. Consulte a documentação das APIs (OpenAI, UAZAPI)
3. Entre em contato com a equipe de desenvolvimento

---

## 📝 Changelog

### v2.0.0 - 17/11/2025

#### Adicionado
- ✅ Sistema completo de sincronização com administradoras
- ✅ LangGraph Agent para WhatsApp com IA
- ✅ UI para configuração e monitoramento de sincronizações
- ✅ 3 novas Edge Functions
- ✅ 3 novas tabelas no banco de dados
- ✅ Templates de scraping configuráveis
- ✅ Notificações por email
- ✅ Logs detalhados de auditoria

#### Modificado
- ✅ Webhook WhatsApp agora invoca agente IA
- ✅ Tabela administrators com campos de sincronização
- ✅ Supabase config.toml com novas funções

---

**Desenvolvido com ❤️ para FFP Portal**
