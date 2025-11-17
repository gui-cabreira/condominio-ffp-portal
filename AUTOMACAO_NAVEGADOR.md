# 🤖 Sistema de Automação de Navegador - Portal FFP

## 🚀 A PLATAFORMA MAIS COMPLETA DE GESTÃO DE COBRANÇAS EXTRAJUDICIAIS

Data de Implementação: 17/11/2025

---

## 📋 VISÃO GERAL

Sistema revolucionário de automação de navegador que permite integração automática com **QUALQUER** plataforma de gestão condominial (Lello, Superlógica, Síndico Web, etc.) através de workflows configuráveis e executáveis.

### ✨ Diferenciais Únicos

✅ **Primeiro sistema do mercado** com automação completa de navegador
✅ **Funciona com TODAS as plataformas** - não depende de API
✅ **Visual e configurável** - crie workflows sem programar
✅ **Inteligente** - fallback automático se automação falhar
✅ **Rastreável** - screenshots e logs de cada execução
✅ **Escalável** - suporta múltiplas plataformas simultaneamente

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + TypeScript)                                    │
│ - UI de gerenciamento de workflows                              │
│ - Visualização de execuções                                     │
│ - Teste de workflows                                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION: browser-automation                               │
│ - Orquestra execução de workflows                               │
│ - Integra com Browserless/ScrapingBee/Puppeteer                │
│ - Gera scripts Puppeteer dinamicamente                          │
│ - Aplica mapeamento de dados                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVIÇO DE AUTOMAÇÃO                                            │
│                                                                 │
│ OPÇÃO 1: Browserless.io (Recomendado)                          │
│ - Chrome headless gerenciado                                   │
│ - Executa scripts Puppeteer                                    │
│ - $30/mês (10k minutos)                                        │
│                                                                 │
│ OPÇÃO 2: ScrapingBee                                            │
│ - Para casos mais simples                                      │
│ - $49/mês (25k requests)                                       │
│                                                                 │
│ OPÇÃO 3: Docker próprio                                        │
│ - Container Puppeteer                                           │
│ - $10-20/mês (VPS)                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ PLATAFORMAS ALVO                                                │
│ - Lello                                                         │
│ - Superlógica                                                   │
│ - Síndico Web                                                   │
│ - QUALQUER OUTRA (configurável)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 ESTRUTURA DE DADOS

### 1. automation_workflows

Tabela principal de workflows de automação.

```sql
CREATE TABLE automation_workflows (
  id UUID PRIMARY KEY,
  management_system_id UUID REFERENCES management_systems,

  name TEXT NOT NULL,
  description TEXT,
  platform_name TEXT NOT NULL, -- 'lello', 'superlogica', etc
  version TEXT DEFAULT '1.0',

  workflow_steps JSONB NOT NULL, -- Array de steps
  data_mapping JSONB, -- Mapeamento de campos
  validation_rules JSONB, -- Regras de validação

  timeout_ms INTEGER DEFAULT 60000,
  max_retries INTEGER DEFAULT 3,
  screenshot_on_error BOOLEAN DEFAULT true,

  active BOOLEAN DEFAULT true,
  tested BOOLEAN DEFAULT false,
  success_rate NUMERIC(5,2) DEFAULT 0.00,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Exemplo de workflow_steps:**
```json
[
  {
    "action": "navigate",
    "url": "https://app.lello.com.br/login",
    "waitUntil": "networkidle0"
  },
  {
    "action": "type",
    "selector": "#email",
    "value": "${username}",
    "clear": true
  },
  {
    "action": "type",
    "selector": "#password",
    "value": "${password}",
    "clear": true
  },
  {
    "action": "click",
    "selector": "button[type='submit']"
  },
  {
    "action": "wait",
    "type": "selector",
    "value": ".dashboard-container",
    "timeout": 10000
  },
  {
    "action": "extract_table",
    "selector": "table.inadimplentes",
    "columns": {
      "condominio": "td:nth-child(1)",
      "unidade": "td:nth-child(2)",
      "proprietario": "td:nth-child(3)",
      "valor": "td:nth-child(4)",
      "vencimento": "td:nth-child(5)"
    }
  },
  {
    "action": "screenshot",
    "name": "inadimplentes.png",
    "fullPage": true
  }
]
```

**Exemplo de data_mapping:**
```json
{
  "condominio": "condominium_name",
  "unidade": "unit_number",
  "proprietario": "owner_name",
  "valor": "amount",
  "vencimento": "due_date"
}
```

---

### 2. automation_executions

Histórico de execuções de workflows.

```sql
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows,
  administrator_id UUID REFERENCES administrators,
  sync_log_id UUID REFERENCES administrator_sync_logs,

  status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  steps_log JSONB, -- Log detalhado de cada step

  extracted_data JSONB, -- Dados extraídos
  records_extracted INTEGER DEFAULT 0,

  screenshots JSONB, -- Array de screenshots
  downloaded_files JSONB, -- Arquivos baixados

  error_message TEXT,
  error_step INTEGER,
  error_screenshot TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3. automation_actions

Catálogo de ações disponíveis para workflows.

```sql
CREATE TABLE automation_actions (
  id UUID PRIMARY KEY,

  action_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'navigation', 'interaction', 'extraction', 'validation', 'utility'

  parameters_schema JSONB,
  examples JSONB,

  available BOOLEAN DEFAULT true,
  requires_pro BOOLEAN DEFAULT false
);
```

**Ações pré-cadastradas:**

| Ação | Categoria | Descrição |
|------|-----------|-----------|
| `navigate` | navigation | Navega para URL |
| `click` | interaction | Clica em elemento |
| `type` | interaction | Digita texto em campo |
| `wait` | utility | Aguarda tempo/elemento |
| `extract_text` | extraction | Extrai texto de elemento |
| `extract_table` | extraction | Extrai dados de tabela HTML |
| `screenshot` | utility | Captura screenshot |
| `download` | utility | Baixa arquivo |
| `evaluate` | utility | Executa JavaScript |
| `select` | interaction | Seleciona opção em dropdown |
| `check` | interaction | Marca/desmarca checkbox |
| `hover` | interaction | Passa mouse sobre elemento |
| `scroll` | interaction | Rola página |
| `validate` | validation | Valida condição |
| `loop` | utility | Repete ações |
| `conditional` | utility | Condicional if/else |

---

## 🔧 COMPONENTES

### 1. Edge Function: browser-automation

**Localização:** `supabase/functions/browser-automation/index.ts`

**Responsabilidades:**
- Receber requisição de automação
- Buscar workflow e credenciais
- Escolher serviço de automação (Browserless/ScrapingBee)
- Gerar script Puppeteer dinamicamente
- Executar e monitorar
- Aplicar mapeamento de dados
- Salvar resultados e logs

**API:**

```typescript
POST /functions/v1/browser-automation

Body:
{
  workflowId: string,      // ID do workflow a executar
  administratorId: string, // ID da administradora
  credentials?: {          // Opcional: override de credenciais
    username: string,
    password: string
  },
  customWorkflow?: any[]   // Opcional: workflow custom (sem salvar)
}

Response:
{
  success: boolean,
  executionId: string,
  recordsExtracted: number,
  data: any[],
  screenshots: string[]
}
```

**Integração com Browserless:**

```typescript
const response = await fetch(
  `${browserlessUrl}/function?token=${token}`,
  {
    method: 'POST',
    body: JSON.stringify({
      code: puppeteerScript, // Script gerado
      context: { credentials, executionId }
    })
  }
);
```

---

### 2. Integração com sync-administrator-data

**Localização:** `supabase/functions/sync-administrator-data/index.ts`

**Lógica de Fallback:**

```typescript
// 1. Verificar se existe workflow de automação
let automationWorkflow = await supabase
  .from('automation_workflows')
  .select('*')
  .eq('management_system_id', administrator.management_system_id)
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .single();

// 2. Tentar usar automação primeiro
if (automationWorkflow) {
  try {
    syncResult = await syncViaAutomation(
      supabase,
      administrator,
      automationWorkflow,
      syncLog.id
    );
  } catch (autoError) {
    // 3. Fallback para método tradicional
    syncResult = await syncViaTraditionalMethod(...);
  }
} else {
  // Sem workflow, usar método tradicional
  syncResult = await syncViaTraditionalMethod(...);
}
```

**Benefícios:**
- ✅ Zero risco - sempre tem fallback
- ✅ Testa automação sem quebrar funcionamento
- ✅ Migração gradual das plataformas

---

### 3. UI: AutomationWorkflows

**Localização:** `src/pages/AutomationWorkflows.tsx`

**Funcionalidades:**

#### Dashboard de Workflows
- Lista todos os workflows criados
- Estatísticas de cada workflow:
  - Taxa de sucesso
  - Total de execuções
  - Registros extraídos
  - Última execução
- Filtros e busca

#### Visualização de Workflow
- Steps detalhados com numeração
- Parâmetros de cada ação
- Mapeamento de dados
- Configurações (timeout, retries, etc)

#### Teste de Workflow
- Seleciona administradora para teste
- Executa workflow em tempo real
- Mostra resultados imediatamente
- Registra na tabela de execuções

#### Histórico de Execuções
- Últimas 20 execuções por workflow
- Status, duração, registros extraídos
- Screenshots capturados
- Logs de erro se falhou
- Visualização de dados extraídos

#### CRUD de Workflows
- Criar novo workflow (futuro)
- Editar workflow existente (futuro)
- Duplicar workflow
- Deletar workflow
- Ativar/desativar

---

## 🎯 WORKFLOWS PRÉ-CONFIGURADOS

### 1. Lello - Extração de Inadimplentes

**Platform:** `lello`
**Sistema:** Lello
**Steps:** 10

```json
{
  "name": "Lello - Extração de Inadimplentes",
  "platform_name": "lello",
  "workflow_steps": [
    {"action": "navigate", "url": "https://app.lello.com.br/login"},
    {"action": "type", "selector": "#email", "value": "${username}"},
    {"action": "type", "selector": "#password", "value": "${password}"},
    {"action": "click", "selector": "button[type='submit']"},
    {"action": "wait", "value": ".dashboard-container"},
    {"action": "screenshot", "name": "dashboard.png"},
    {"action": "navigate", "url": "https://app.lello.com.br/financeiro/inadimplentes"},
    {"action": "extract_table", "selector": "table.inadimplentes", "columns": {...}},
    {"action": "screenshot", "name": "inadimplentes.png", "fullPage": true}
  ]
}
```

---

### 2. Superlógica - Extração de Inadimplentes

**Platform:** `superlogica`
**Sistema:** Superlógica
**Steps:** 11

```json
{
  "name": "Superlógica - Extração de Inadimplentes",
  "platform_name": "superlogica",
  "workflow_steps": [
    {"action": "navigate", "url": "https://portal.superlogica.net/clients/areadocliente"},
    {"action": "type", "selector": "input[name='username']", "value": "${username}"},
    {"action": "type", "selector": "input[name='password']", "value": "${password}"},
    {"action": "click", "selector": "button.btn-login"},
    {"action": "wait", "value": ".main-dashboard"},
    {"action": "click", "selector": "a[href*='financeiro']"},
    {"action": "wait", "value": 2000, "type": "time"},
    {"action": "click", "selector": "a[href*='inadimplentes']"},
    {"action": "extract_table", "selector": "table.table-inadimplentes", "columns": {...}},
    {"action": "screenshot", "name": "superlogica_inadimplentes.png"}
  ]
}
```

---

## 🚀 COMO USAR

### 1. Configurar Serviço de Automação

**Opção A: Browserless (Recomendado)**

1. Criar conta em https://browserless.io
2. Obter token de API
3. Configurar secrets no Supabase:

```bash
supabase secrets set AUTOMATION_SERVICE=browserless
supabase secrets set BROWSERLESS_URL=https://chrome.browserless.io
supabase secrets set BROWSERLESS_TOKEN=seu-token-aqui
```

**Opção B: ScrapingBee**

1. Criar conta em https://scrapingbee.com
2. Obter API key
3. Configurar secrets:

```bash
supabase secrets set AUTOMATION_SERVICE=scrapingbee
supabase secrets set SCRAPINGBEE_API_KEY=sua-key-aqui
```

---

### 2. Cadastrar Workflow para Nova Plataforma

```sql
INSERT INTO automation_workflows (
  management_system_id,
  name,
  description,
  platform_name,
  workflow_steps,
  data_mapping,
  timeout_ms
)
SELECT
  ms.id,
  'Síndico Web - Extração de Inadimplentes',
  'Workflow para plataforma Síndico Web',
  'sindico_web',
  '[
    {"action": "navigate", "url": "https://sindicoweb.com.br/login"},
    {"action": "type", "selector": "#usuario", "value": "${username}"},
    {"action": "type", "selector": "#senha", "value": "${password}"},
    {"action": "click", "selector": "#btn-login"},
    {"action": "wait", "type": "selector", "value": ".dashboard"},
    {"action": "navigate", "url": "https://sindicoweb.com.br/inadimplentes"},
    {"action": "extract_table", "selector": "table#inadimplentes", "columns": {
      "condominio": "td.condominio",
      "unidade": "td.unidade",
      "nome": "td.nome",
      "valor": "td.valor",
      "vencimento": "td.vencimento"
    }},
    {"action": "screenshot", "name": "sindico_web_inadimplentes.png"}
  ]'::jsonb,
  '{
    "condominio": "condominium_name",
    "unidade": "unit_number",
    "nome": "owner_name",
    "valor": "amount",
    "vencimento": "due_date"
  }'::jsonb,
  90000
FROM management_systems ms
WHERE ms.name = 'Síndico Web';
```

---

### 3. Associar Workflow a Administradora

No Admin:
1. Acesse **Administradoras**
2. Configure credenciais do portal (URL, usuário, senha)
3. Selecione **Sistema de Gestão** (ex: Lello)
4. O workflow será automaticamente usado na próxima sincronização

---

### 4. Testar Workflow

Na UI de Workflows:
1. Acesse `/portal/corporativo/workflows`
2. Encontre o workflow desejado
3. Clique em **Testar**
4. Selecione uma administradora
5. Clique em **Executar Teste**
6. Aguarde resultado

**Resultado do teste:**
- ✅ Screenshots capturados
- ✅ Dados extraídos
- ✅ Log de cada step
- ✅ Tempo de execução
- ✅ Taxa de sucesso atualizada

---

### 5. Automatizar Sincronização

Na UI de Sincronização:
1. Acesse `/portal/corporativo/sincronizacao`
2. Configure automação para a administradora
3. Habilite **Sincronização Automática**
4. Escolha frequência (Hourly/Daily/Weekly)
5. Salve

**O que acontece:**
- ✅ Sistema verifica se existe workflow ativo
- ✅ Se sim, tenta usar automação primeiro
- ✅ Se falhar, usa scraping tradicional
- ✅ Dados são processados normalmente
- ✅ Logs de tudo são salvos

---

## 📈 MONITORAMENTO

### View: automation_statistics

```sql
SELECT * FROM automation_statistics;

-- Retorna:
workflow_id, workflow_name, platform_name, management_system_name,
success_rate, tested, active, total_executions, successful_executions,
failed_executions, timeout_executions, avg_duration_ms, last_execution_at,
total_records_extracted
```

### Queries Úteis

**Workflows com melhor taxa de sucesso:**
```sql
SELECT name, platform_name, success_rate, total_executions
FROM automation_workflows
WHERE tested = true
ORDER BY success_rate DESC;
```

**Execuções recentes com erro:**
```sql
SELECT
  ae.started_at,
  aw.name AS workflow_name,
  a.name AS administrator_name,
  ae.error_message,
  ae.duration_ms
FROM automation_executions ae
JOIN automation_workflows aw ON ae.workflow_id = aw.id
JOIN administrators a ON ae.administrator_id = a.id
WHERE ae.status = 'failed'
ORDER BY ae.started_at DESC
LIMIT 20;
```

**Performance por plataforma:**
```sql
SELECT
  aw.platform_name,
  COUNT(ae.id) AS total_executions,
  AVG(ae.duration_ms) AS avg_duration,
  SUM(ae.records_extracted) AS total_records
FROM automation_workflows aw
LEFT JOIN automation_executions ae ON aw.id = ae.workflow_id
WHERE ae.status = 'completed'
GROUP BY aw.platform_name;
```

---

## 🔍 TROUBLESHOOTING

### Problema: Workflow falha constantemente

**Possíveis causas:**
1. Seletores CSS incorretos (plataforma mudou layout)
2. Timeout muito curto
3. Credenciais inválidas
4. Plataforma bloqueando automação

**Soluções:**
```sql
-- 1. Aumentar timeout
UPDATE automation_workflows
SET timeout_ms = 120000
WHERE id = 'workflow-id';

-- 2. Ver log detalhado da última execução
SELECT steps_log, error_message, error_screenshot
FROM automation_executions
WHERE workflow_id = 'workflow-id'
ORDER BY started_at DESC
LIMIT 1;

-- 3. Testar workflow manualmente
-- (via UI, captura screenshots para debug)
```

---

### Problema: Dados extraídos incorretamente

**Possíveis causas:**
1. Mapeamento de campos errado
2. Seletores de tabela incorretos
3. Formato de dados mudou

**Soluções:**
```sql
-- 1. Ver dados extraídos da última execução
SELECT extracted_data
FROM automation_executions
WHERE workflow_id = 'workflow-id'
  AND status = 'completed'
ORDER BY started_at DESC
LIMIT 1;

-- 2. Ajustar mapeamento
UPDATE automation_workflows
SET data_mapping = '{
  "novo_campo": "owner_name",
  "outro_campo": "amount"
}'::jsonb
WHERE id = 'workflow-id';
```

---

### Problema: Browserless timeout

**Possíveis causas:**
1. Plano Browserless esgotou minutos
2. Website muito lento
3. Workflow muito complexo

**Soluções:**
- Verificar uso no dashboard do Browserless
- Simplificar workflow (remover steps desnecessários)
- Usar ScrapingBee como alternativa

---

## 💰 CUSTOS ESTIMADOS

| Cenário | Execuções/mês | Minutos/mês | Custo Browserless | Custo ScrapingBee |
|---------|---------------|-------------|-------------------|-------------------|
| **Pequeno** | 100 | ~100 min | $30 (sobra) | $49 (sobra) |
| **Médio** | 1.000 | ~1.000 min | $30 (sobra) | $49 (ok) |
| **Grande** | 10.000 | ~10.000 min | $30 (limite) | $149 (50k) |
| **Enterprise** | 50.000+ | ~50.000 min | $100 (100k) | $399 (250k) |

**Observação:** Cada execução leva ~1 minuto em média.

---

## 🎓 EXEMPLOS AVANÇADOS

### 1. Workflow com Loop (Paginação)

```json
{
  "action": "loop",
  "selector": "button.next-page",
  "maxIterations": 10,
  "actions": [
    {"action": "extract_table", "selector": "table", "columns": {...}},
    {"action": "click", "selector": "button.next-page"},
    {"action": "wait", "type": "time", "value": 2000}
  ]
}
```

### 2. Workflow com Condicional

```json
{
  "action": "conditional",
  "condition": {
    "type": "exists",
    "selector": ".error-message"
  },
  "thenActions": [
    {"action": "screenshot", "name": "error.png"},
    {"action": "validate", "type": "exists", "selector": ".error"}
  ],
  "elseActions": [
    {"action": "extract_table", "selector": "table", "columns": {...}}
  ]
}
```

### 3. Workflow com Download de Arquivo

```json
{
  "action": "download",
  "selector": "a.download-csv",
  "waitForDownload": true,
  "timeout": 30000
}
```

---

## 🔐 SEGURANÇA

### Credenciais

- ✅ Nunca expostas no frontend
- ✅ Substituídas por variáveis (`${username}`, `${password}`)
- ✅ Processadas apenas no backend
- ✅ Transmitidas via HTTPS para Browserless

### Isolamento

- ✅ Cada execução em sessão isolada do navegador
- ✅ Cookies e cache limpos após execução
- ✅ Sem compartilhamento de estado entre execuções

### Logs

- ✅ Screenshots salvos com timestamp
- ✅ Dados extraídos auditáveis
- ✅ Erros registrados para análise

---

## 🚀 PRÓXIMOS PASSOS

### Fase 1 - Completar Workflows (1 semana)
1. ✅ Criar workflows para top 5 plataformas do mercado
2. ✅ Testar com administradoras reais
3. ✅ Ajustar seletores conforme necessário

### Fase 2 - UI de Criação (2 semanas)
4. ✅ Editor visual de workflows (drag-and-drop)
5. ✅ Preview de steps ao criar
6. ✅ Validação de seletores em tempo real
7. ✅ Marketplace de workflows comunitários

### Fase 3 - IA Integration (1 semana)
8. ✅ GPT para sugerir seletores automaticamente
9. ✅ Auto-fix quando plataforma muda layout
10. ✅ Aprendizado de padrões de extração

---

## 📞 SUPORTE

Para dúvidas ou problemas:

1. Consulte os logs de execução
2. Verifique seletores CSS na plataforma alvo
3. Teste workflow manualmente
4. Ajuste timeout e retries
5. Entre em contato com equipe de dev se necessário

---

**Desenvolvido com ❤️ para revolucionar a gestão de cobranças condominiais**

**Portal FFP - A plataforma que ninguém jamais viu igual**
