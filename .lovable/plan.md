

# Plano: Corrigir Fluxo de Cobrança no CRM e Criar Sistema de Notificacoes

## Problemas Identificados

1. **Pagina de Atendimento** envia parametros incorretos ao `send-charge-notification` (envia `phone`, `unitId`, `type` ao inves de `chargeId` e `channel`)
2. **Nao existe sistema de notificacoes internas** na plataforma (bell icon, alertas para os operadores)
3. **O fluxo WhatsApp -> Agente -> Resposta funciona**, mas precisa que o telefone da unidade esteja cadastrado corretamente

## O Que Sera Feito

### Parte 1: Corrigir Disparo de Cobranca no Atendimento

**Arquivo**: `src/pages/AtendimentoPage.tsx`

- Corrigir a funcao `sendChargeDetails` para enviar os parametros corretos (`chargeId` e `channel: 'whatsapp'`)
- Quando a conversa tem cobranças associadas, usar o `chargeId` da primeira cobranca pendente
- Adicionar feedback visual quando nao houver cobranca vinculada

### Parte 2: Sistema de Notificacoes Internas

Criar um sistema de notificacoes que alerta os operadores sobre eventos importantes.

**Tabela nova**: `notifications`
- `id` (uuid)
- `user_id` (uuid) - destinatario
- `title` (text)
- `message` (text)  
- `type` (text) - info, warning, success, error
- `category` (text) - charge, whatsapp, system, negotiation
- `read` (boolean, default false)
- `read_at` (timestamp)
- `action_url` (text) - link para acao
- `metadata` (jsonb)
- `created_at` (timestamp)

**RLS**: Usuarios so veem suas proprias notificacoes.

**Componente**: `NotificationBell.tsx`
- Icone de sino no header/sidebar com badge de contagem
- Dropdown com lista das ultimas notificacoes
- Marcar como lida ao clicar
- Link para "Ver todas"

**Pagina**: `/notificacoes`
- Lista completa de notificacoes com filtros por tipo/categoria
- Acoes: marcar como lida, marcar todas como lidas

**Eventos que geram notificacoes**:
- Nova mensagem WhatsApp recebida (para operadores)
- Comprovante de pagamento enviado
- Negociacao proposta pelo agente
- Cobranca vencida
- Novo usuario aguardando aprovacao

### Parte 3: Gerar Notificacoes Automaticas nas Edge Functions

Modificar as functions existentes para inserir notificacoes:

- `uazapi-webhook`: Ao receber mensagem, notificar operadores
- `send-charge-notification`: Ao enviar cobranca, registrar notificacao
- Trigger no banco: Quando `payment_proofs` recebe novo registro, notificar admins

## Detalhes Tecnicos

### Migracao SQL
```text
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text DEFAULT 'system',
  read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios veem apenas suas notificacoes
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios podem atualizar suas notificacoes (marcar lida)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role pode inserir (via edge functions)
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### Arquivos Novos
- `src/components/NotificationBell.tsx` - Componente do sino
- `src/pages/NotificationsPage.tsx` - Pagina completa

### Arquivos Modificados
- `src/pages/AtendimentoPage.tsx` - Corrigir `sendChargeDetails`
- `src/components/AppSidebar.tsx` - Adicionar link Notificacoes + NotificationBell
- `src/App.tsx` - Adicionar rota `/notificacoes`
- `supabase/functions/uazapi-webhook/index.ts` - Gerar notificacao ao receber mensagem

