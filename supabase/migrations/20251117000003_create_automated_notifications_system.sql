-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES AUTOMÁTICAS COM ESCALONAMENTO
-- =====================================================

-- Tabela de estratégias de notificação
CREATE TABLE notification_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  administrator_id UUID REFERENCES administrators(id),
  condominium_id UUID REFERENCES condominiums(id),
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Se ambos NULL, é estratégia global
  -- Se administrator_id, aplica a todos condomínios da administradora
  -- Se condominium_id, aplica apenas ao condomínio específico
  CONSTRAINT check_strategy_scope CHECK (
    (administrator_id IS NULL AND condominium_id IS NULL AND is_default = true) OR
    (administrator_id IS NOT NULL AND condominium_id IS NULL) OR
    (administrator_id IS NULL AND condominium_id IS NOT NULL)
  )
);

-- Tabela de regras de escalonamento
CREATE TABLE notification_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES notification_strategies(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL, -- 1, 2, 3...
  trigger_days_after_due INTEGER NOT NULL, -- 0 = no vencimento, 3 = 3 dias após, etc
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'all')),
  template_id UUID REFERENCES notification_templates(id),
  custom_message TEXT,
  send_time TIME DEFAULT '09:00:00', -- Horário preferencial para envio
  max_attempts INTEGER DEFAULT 1,
  retry_interval_hours INTEGER DEFAULT 24,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(strategy_id, sequence_order)
);

-- Tabela de templates de notificação
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('charge_reminder', 'overdue_notice', 'final_notice', 'negotiation_offer', 'payment_confirmation', 'custom')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  subject TEXT, -- Para emails
  body TEXT NOT NULL,
  variables JSONB, -- Lista de variáveis disponíveis: {nome}, {valor}, etc
  administrator_id UUID REFERENCES administrators(id),
  is_system BOOLEAN DEFAULT false, -- Templates do sistema não podem ser deletados
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de notificações enviadas
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES notification_escalation_rules(id),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL, -- email ou telefone
  message_sent TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'bounced')),
  attempt_number INTEGER DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  external_message_id TEXT, -- ID da mensagem no provedor (UAZAPI, Resend, etc)
  metadata JSONB, -- Dados adicionais do envio
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notification_history_charge ON notification_history(charge_id);
CREATE INDEX idx_notification_history_status ON notification_history(status);
CREATE INDEX idx_notification_history_scheduled ON notification_history(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_escalation_rules_strategy ON notification_escalation_rules(strategy_id);

-- Tabela de configurações de canais por proprietário
CREATE TABLE owner_channel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  enabled BOOLEAN DEFAULT true,
  contact_value TEXT, -- email ou telefone específico
  preferred_time_start TIME DEFAULT '08:00:00',
  preferred_time_end TIME DEFAULT '20:00:00',
  do_not_disturb_days INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- 0=domingo, 6=sábado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(owner_id, channel)
);

-- Tabela de blacklist (opt-out)
CREATE TABLE notification_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('email', 'whatsapp', 'sms', 'all')),
  reason TEXT,
  blacklisted_at TIMESTAMPTZ DEFAULT NOW(),
  blacklisted_by UUID REFERENCES users(id),

  UNIQUE(owner_id, channel)
);

-- =====================================================
-- TEMPLATES PADRÃO DO SISTEMA
-- =====================================================

INSERT INTO notification_templates (name, type, channel, subject, body, variables, is_system) VALUES
(
  'Lembrete de Vencimento - Email',
  'charge_reminder',
  'email',
  'Lembrete: Cobrança vence hoje - {condominio}',
  '<h2>Olá, {nome}!</h2>
<p>Este é um lembrete amigável de que você possui uma cobrança com vencimento <strong>hoje</strong>.</p>

<h3>Detalhes da Cobrança:</h3>
<ul>
  <li><strong>Condomínio:</strong> {condominio}</li>
  <li><strong>Unidade:</strong> {unidade}</li>
  <li><strong>Valor:</strong> {valor}</li>
  <li><strong>Vencimento:</strong> {vencimento}</li>
  <li><strong>Competência:</strong> {competencia}</li>
</ul>

<p>Para evitar juros e multas, realize o pagamento o quanto antes.</p>

<p><a href="{link_pagamento}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">💳 Pagar Agora</a></p>

<p>Em caso de dúvidas, estamos à disposição.</p>

<p>Atenciosamente,<br>{administradora}</p>',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor": "Valor formatado", "vencimento": "Data de vencimento", "competencia": "Mês/ano de competência", "link_pagamento": "Link para pagamento", "administradora": "Nome da administradora"}',
  true
),
(
  'Lembrete de Vencimento - WhatsApp',
  'charge_reminder',
  'whatsapp',
  NULL,
  '👋 Olá, *{nome}*!

📅 Lembrete: Sua cobrança vence *hoje*!

🏢 *Condomínio:* {condominio}
🏠 *Unidade:* {unidade}
💰 *Valor:* {valor}
📆 *Vencimento:* {vencimento}
📊 *Competência:* {competencia}

Para evitar juros e multas, realize o pagamento o quanto antes.

💳 *Pagar agora:* {link_pagamento}

Em caso de dúvidas, estamos à disposição! 😊',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor": "Valor formatado", "vencimento": "Data de vencimento", "competencia": "Mês/ano de competência", "link_pagamento": "Link para pagamento"}',
  true
),
(
  'Cobrança Atrasada - Email',
  'overdue_notice',
  'email',
  '⚠️ Cobrança em Atraso - {condominio}',
  '<h2>Olá, {nome}</h2>
<p style="color: #dc2626;">Identificamos que você possui uma cobrança <strong>em atraso</strong>.</p>

<h3>Detalhes da Cobrança:</h3>
<ul>
  <li><strong>Condomínio:</strong> {condominio}</li>
  <li><strong>Unidade:</strong> {unidade}</li>
  <li><strong>Valor Original:</strong> {valor_original}</li>
  <li><strong>Juros/Multa:</strong> {juros_multa}</li>
  <li><strong>Valor Atualizado:</strong> {valor_atualizado}</li>
  <li><strong>Vencimento:</strong> {vencimento}</li>
  <li><strong>Dias de Atraso:</strong> {dias_atraso}</li>
</ul>

<p>Regularize sua situação o quanto antes para evitar o acúmulo de encargos.</p>

<p><a href="{link_pagamento}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">💳 Pagar Agora</a></p>

<p><a href="{link_negociacao}" style="color: #059669; text-decoration: underline;">Precisa negociar? Clique aqui</a></p>

<p>Atenciosamente,<br>{administradora}</p>',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor_original": "Valor original", "juros_multa": "Juros e multa", "valor_atualizado": "Valor atualizado", "vencimento": "Data de vencimento", "dias_atraso": "Dias em atraso", "link_pagamento": "Link para pagamento", "link_negociacao": "Link para negociação", "administradora": "Nome da administradora"}',
  true
),
(
  'Cobrança Atrasada - WhatsApp',
  'overdue_notice',
  'whatsapp',
  NULL,
  '⚠️ *COBRANÇA EM ATRASO*

Olá, {nome}!

Identificamos que você possui uma cobrança em atraso.

🏢 *Condomínio:* {condominio}
🏠 *Unidade:* {unidade}
💰 *Valor Original:* {valor_original}
📈 *Juros/Multa:* {juros_multa}
💵 *Valor Atualizado:* {valor_atualizado}
📆 *Vencimento:* {vencimento}
⏰ *Dias de Atraso:* {dias_atraso}

⚡ Regularize sua situação o quanto antes!

💳 *Pagar agora:* {link_pagamento}

🤝 *Precisa negociar?* {link_negociacao}

Estamos à disposição! 😊',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor_original": "Valor original", "juros_multa": "Juros e multa", "valor_atualizado": "Valor atualizado", "vencimento": "Data de vencimento", "dias_atraso": "Dias em atraso", "link_pagamento": "Link para pagamento", "link_negociacao": "Link para negociação"}',
  true
),
(
  'Aviso Final - WhatsApp',
  'final_notice',
  'whatsapp',
  NULL,
  '🚨 *AVISO FINAL - AÇÃO URGENTE NECESSÁRIA*

{nome}, sua situação está crítica!

🏢 *Condomínio:* {condominio}
🏠 *Unidade:* {unidade}
💰 *Valor Total:* {valor_atualizado}
⏰ *Dias de Atraso:* {dias_atraso}

⚠️ *Próximos Passos:*
• Protesto em cartório
• Negativação nos órgãos de proteção ao crédito
• Ação judicial de cobrança

⚡ *ÚLTIMA CHANCE DE REGULARIZAR!*

💳 *Pagar agora:* {link_pagamento}
🤝 *Negociar débito:* {link_negociacao}

📞 Contato urgente: {telefone_administradora}',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor_atualizado": "Valor atualizado", "dias_atraso": "Dias em atraso", "link_pagamento": "Link para pagamento", "link_negociacao": "Link para negociação", "telefone_administradora": "Telefone da administradora"}',
  true
),
(
  'Confirmação de Pagamento - WhatsApp',
  'payment_confirmation',
  'whatsapp',
  NULL,
  '✅ *PAGAMENTO CONFIRMADO!*

Parabéns, {nome}! 🎉

Seu pagamento foi confirmado com sucesso!

🏢 *Condomínio:* {condominio}
🏠 *Unidade:* {unidade}
💰 *Valor Pago:* {valor_pago}
📆 *Data do Pagamento:* {data_pagamento}
🔢 *Comprovante:* {comprovante}

Obrigado por manter suas obrigações em dia! 😊

{administradora}',
  '{"nome": "Nome do proprietário", "condominio": "Nome do condomínio", "unidade": "Número da unidade", "valor_pago": "Valor pago", "data_pagamento": "Data do pagamento", "comprovante": "Número do comprovante", "administradora": "Nome da administradora"}',
  true
);

-- =====================================================
-- ESTRATÉGIA PADRÃO DE NOTIFICAÇÕES
-- =====================================================

-- Estratégia global padrão
INSERT INTO notification_strategies (name, description, is_default, active)
VALUES (
  'Estratégia Padrão FFP',
  'Estratégia de escalonamento progressivo com múltiplos canais',
  true,
  true
);

-- Regras de escalonamento da estratégia padrão
WITH default_strategy AS (
  SELECT id FROM notification_strategies WHERE is_default = true LIMIT 1
),
reminder_template_whatsapp AS (
  SELECT id FROM notification_templates
  WHERE type = 'charge_reminder' AND channel = 'whatsapp' AND is_system = true LIMIT 1
),
reminder_template_email AS (
  SELECT id FROM notification_templates
  WHERE type = 'charge_reminder' AND channel = 'email' AND is_system = true LIMIT 1
),
overdue_template_email AS (
  SELECT id FROM notification_templates
  WHERE type = 'overdue_notice' AND channel = 'email' AND is_system = true LIMIT 1
),
overdue_template_whatsapp AS (
  SELECT id FROM notification_templates
  WHERE type = 'overdue_notice' AND channel = 'whatsapp' AND is_system = true LIMIT 1
),
final_template AS (
  SELECT id FROM notification_templates
  WHERE type = 'final_notice' AND channel = 'whatsapp' AND is_system = true LIMIT 1
)

INSERT INTO notification_escalation_rules
  (strategy_id, sequence_order, trigger_days_after_due, channel, template_id, send_time, max_attempts)
SELECT
  default_strategy.id,
  *
FROM default_strategy,
(VALUES
  (1, 0, 'email', (SELECT id FROM reminder_template_email), '09:00:00', 1),      -- Dia do vencimento - Email
  (2, 0, 'whatsapp', (SELECT id FROM reminder_template_whatsapp), '10:00:00', 1), -- Dia do vencimento - WhatsApp
  (3, 3, 'email', (SELECT id FROM overdue_template_email), '09:00:00', 1),        -- 3 dias após - Email
  (4, 7, 'whatsapp', (SELECT id FROM overdue_template_whatsapp), '09:00:00', 2),  -- 7 dias após - WhatsApp (2 tentativas)
  (5, 15, 'all', (SELECT id FROM overdue_template_whatsapp), '09:00:00', 1),      -- 15 dias após - Todos canais
  (6, 30, 'whatsapp', (SELECT id FROM final_template), '09:00:00', 3)             -- 30 dias após - Aviso final WhatsApp (3 tentativas)
) AS rules(seq, days, chan, templ, time, attempts);

-- =====================================================
-- FUNCTIONS E TRIGGERS
-- =====================================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_notification_strategies_updated_at
  BEFORE UPDATE ON notification_strategies
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_notification_history_updated_at
  BEFORE UPDATE ON notification_history
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View de próximas notificações a enviar
CREATE OR REPLACE VIEW pending_notifications AS
SELECT
  nh.id,
  nh.charge_id,
  c.owner_id,
  o.name AS owner_name,
  o.email,
  o.phone,
  c.amount,
  c.due_date,
  c.status AS charge_status,
  (c.due_date - CURRENT_DATE) AS days_until_due,
  nh.channel,
  nh.scheduled_at,
  nh.attempt_number,
  nt.body AS template_body,
  nt.subject AS template_subject
FROM notification_history nh
JOIN charges c ON c.id = nh.charge_id
JOIN owners o ON o.id = c.owner_id
LEFT JOIN notification_escalation_rules ner ON ner.id = nh.rule_id
LEFT JOIN notification_templates nt ON nt.id = ner.template_id
WHERE nh.status = 'pending'
  AND nh.scheduled_at <= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM notification_blacklist nb
    WHERE nb.owner_id = o.id
    AND (nb.channel = nh.channel OR nb.channel = 'all')
  )
ORDER BY nh.scheduled_at;

-- View de estatísticas de notificação
CREATE OR REPLACE VIEW notification_statistics AS
SELECT
  c.administrator_id,
  nh.channel,
  DATE(nh.sent_at) AS sent_date,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE nh.status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE nh.status = 'read') AS read,
  COUNT(*) FILTER (WHERE nh.status = 'failed') AS failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE nh.status = 'delivered') / NULLIF(COUNT(*), 0),
    2
  ) AS delivery_rate,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE nh.status = 'read') / NULLIF(COUNT(*), 0),
    2
  ) AS read_rate
FROM notification_history nh
JOIN charges c ON c.id = nh.charge_id
WHERE nh.sent_at IS NOT NULL
GROUP BY c.administrator_id, nh.channel, DATE(nh.sent_at);

-- RLS Policies
ALTER TABLE notification_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_channel_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_blacklist ENABLE ROW LEVEL SECURITY;

-- Policies básicas (ajustar conforme necessário)
CREATE POLICY "Users can view notification strategies" ON notification_strategies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage notification strategies" ON notification_strategies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view notification history" ON notification_history
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE notification_strategies IS 'Estratégias de notificação com regras de escalonamento progressivo';
COMMENT ON TABLE notification_escalation_rules IS 'Regras de quando e como enviar notificações (escalonamento)';
COMMENT ON TABLE notification_templates IS 'Templates de mensagens para diferentes canais e tipos';
COMMENT ON TABLE notification_history IS 'Histórico completo de todas as notificações enviadas';
COMMENT ON TABLE owner_channel_preferences IS 'Preferências de canal de comunicação por proprietário';
COMMENT ON TABLE notification_blacklist IS 'Lista de proprietários que optaram por não receber notificações (opt-out)';
