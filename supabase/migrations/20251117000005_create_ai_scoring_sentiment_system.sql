-- =====================================================
-- SISTEMA DE SCORING E ANÁLISE DE SENTIMENTO COM IA
-- =====================================================

-- Tabela de scoring de devedores
CREATE TABLE debtor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES administrators(id),

  -- Score geral (0-1000)
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 1000),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),

  -- Componentes do score
  payment_history_score INTEGER, -- Histórico de pagamentos
  response_rate_score INTEGER, -- Taxa de resposta a mensagens
  negotiation_willingness_score INTEGER, -- Disposição para negociar
  financial_capacity_score INTEGER, -- Capacidade financeira estimada
  engagement_score INTEGER, -- Engajamento nas conversas

  -- Métricas utilizadas no cálculo
  total_charges INTEGER DEFAULT 0,
  paid_charges INTEGER DEFAULT 0,
  overdue_charges INTEGER DEFAULT 0,
  total_debt_amount DECIMAL(15,2) DEFAULT 0,
  avg_days_to_pay INTEGER, -- Média de dias para pagar após vencimento
  payment_history_months INTEGER DEFAULT 0,

  messages_sent_to INTEGER DEFAULT 0,
  messages_received_from INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2), -- Percentual de respostas

  broken_promises INTEGER DEFAULT 0, -- Promessas de pagamento quebradas
  successful_negotiations INTEGER DEFAULT 0,

  last_interaction_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,

  -- Predições com IA
  payment_probability DECIMAL(5,2), -- Probabilidade de pagar (0-100%)
  best_contact_channel TEXT, -- Melhor canal para contato
  best_contact_time TIME, -- Melhor horário
  recommended_strategy TEXT, -- Estratégia recomendada

  -- Metadata e auditoria
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT DEFAULT 'v1.0',
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(owner_id, administrator_id)
);

CREATE INDEX idx_debtor_scores_owner ON debtor_scores(owner_id);
CREATE INDEX idx_debtor_scores_risk ON debtor_scores(risk_level);
CREATE INDEX idx_debtor_scores_overall ON debtor_scores(overall_score DESC);
CREATE INDEX idx_debtor_scores_payment_prob ON debtor_scores(payment_probability DESC);

-- Tabela de análise de sentimento de conversas
CREATE TABLE conversation_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id),
  owner_id UUID REFERENCES owners(id),

  -- Análise de sentimento
  sentiment TEXT NOT NULL CHECK (sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
  sentiment_score DECIMAL(5,2) NOT NULL, -- -1.0 (muito negativo) a +1.0 (muito positivo)
  confidence DECIMAL(5,2), -- Confiança na análise (0-100%)

  -- Classificação da intenção
  intent TEXT, -- 'complaint', 'payment_promise', 'negotiation_request', 'information_request', 'dispute', etc
  intent_confidence DECIMAL(5,2),

  -- Emoções detectadas
  emotions JSONB, -- {"anger": 0.2, "joy": 0.1, "sadness": 0.7, ...}
  keywords JSONB, -- Palavras-chave extraídas

  -- Indicadores específicos
  contains_payment_promise BOOLEAN DEFAULT false,
  contains_negotiation_request BOOLEAN DEFAULT false,
  contains_complaint BOOLEAN DEFAULT false,
  contains_dispute BOOLEAN DEFAULT false,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),

  -- Análise
  analyzed_text TEXT,
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_sentiments_conversation ON conversation_sentiments(conversation_id);
CREATE INDEX idx_conversation_sentiments_owner ON conversation_sentiments(owner_id);
CREATE INDEX idx_conversation_sentiments_sentiment ON conversation_sentiments(sentiment);
CREATE INDEX idx_conversation_sentiments_intent ON conversation_sentiments(intent);

-- Tabela de insights e recomendações de IA
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id),
  charge_id UUID REFERENCES charges(id),
  administrator_id UUID REFERENCES administrators(id),

  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'high_payment_risk',
    'likely_to_negotiate',
    'best_time_to_contact',
    'recommended_discount',
    'escalation_recommended',
    'payment_pattern_detected',
    'engagement_dropping',
    'custom'
  )),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Recomendação de ação
  recommended_action TEXT,
  recommended_action_params JSONB,

  confidence DECIMAL(5,2), -- Confiança no insight (0-100%)

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'actioned', 'dismissed', 'expired')),
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES users(id),

  expires_at TIMESTAMPTZ,

  ai_model TEXT DEFAULT 'gpt-4o',
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_owner ON ai_insights(owner_id);
CREATE INDEX idx_ai_insights_charge ON ai_insights(charge_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_priority ON ai_insights(priority);

-- Tabela de promessas de pagamento
CREATE TABLE payment_promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  message_id UUID REFERENCES whatsapp_messages(id),

  promised_amount DECIMAL(15,2) NOT NULL,
  promised_date DATE NOT NULL,
  promise_made_at TIMESTAMPTZ DEFAULT NOW(),

  -- Detectado automaticamente ou manual
  detected_by TEXT CHECK (detected_by IN ('ai', 'manual', 'user')),
  confidence DECIMAL(5,2), -- Se detectado por IA

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'kept', 'broken', 'renegotiated', 'cancelled')),

  -- Acompanhamento
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,

  fulfilled_at TIMESTAMPTZ,
  payment_id UUID REFERENCES payment_methods(id),

  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_promises_owner ON payment_promises(owner_id);
CREATE INDEX idx_payment_promises_charge ON payment_promises(charge_id);
CREATE INDEX idx_payment_promises_date ON payment_promises(promised_date);
CREATE INDEX idx_payment_promises_status ON payment_promises(status);

-- Tabela de padrões de comportamento detectados
CREATE TABLE behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'pays_after_reminder',
    'negotiates_before_paying',
    'ignores_messages',
    'responds_quickly',
    'pays_only_with_discount',
    'makes_broken_promises',
    'pays_on_time',
    'pays_late_consistently',
    'responsive_to_whatsapp',
    'responsive_to_email',
    'weekend_payer',
    'end_of_month_payer'
  )),

  pattern_name TEXT NOT NULL,
  pattern_description TEXT,

  confidence DECIMAL(5,2) NOT NULL, -- Confiança no padrão (0-100%)
  occurrences INTEGER DEFAULT 1, -- Quantas vezes o padrão foi observado

  first_observed_at TIMESTAMPTZ,
  last_observed_at TIMESTAMPTZ,

  -- Ações recomendadas baseadas no padrão
  recommended_actions JSONB,

  active BOOLEAN DEFAULT true,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(owner_id, pattern_type)
);

CREATE INDEX idx_behavior_patterns_owner ON behavior_patterns(owner_id);
CREATE INDEX idx_behavior_patterns_type ON behavior_patterns(pattern_type);
CREATE INDEX idx_behavior_patterns_active ON behavior_patterns(active);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function para calcular score de um devedor
CREATE OR REPLACE FUNCTION calculate_debtor_score(p_owner_id UUID, p_administrator_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_payment_history_score INTEGER := 0;
  v_response_rate_score INTEGER := 0;
  v_engagement_score INTEGER := 0;

  v_total_charges INTEGER;
  v_paid_charges INTEGER;
  v_overdue_charges INTEGER;
  v_payment_rate DECIMAL;

  v_messages_sent INTEGER;
  v_messages_received INTEGER;
  v_response_rate DECIMAL;

  v_broken_promises INTEGER;
  v_successful_negotiations INTEGER;

  v_risk_level TEXT;
  v_payment_probability DECIMAL;
BEGIN
  -- 1. Calcular score de histórico de pagamento (0-400 pontos)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'overdue')
  INTO v_total_charges, v_paid_charges, v_overdue_charges
  FROM charges
  WHERE owner_id = p_owner_id
    AND (p_administrator_id IS NULL OR administrator_id = p_administrator_id);

  IF v_total_charges > 0 THEN
    v_payment_rate := v_paid_charges::DECIMAL / v_total_charges;
    v_payment_history_score := ROUND(v_payment_rate * 400);
  ELSE
    v_payment_history_score := 200; -- Score neutro para novos clientes
  END IF;

  -- 2. Calcular score de taxa de resposta (0-300 pontos)
  SELECT
    COUNT(*) FILTER (WHERE is_from_me = true),
    COUNT(*) FILTER (WHERE is_from_me = false)
  INTO v_messages_sent, v_messages_received
  FROM whatsapp_messages wm
  JOIN whatsapp_conversations wc ON wc.id = wm.conversation_id
  WHERE wc.owner_id = p_owner_id;

  IF v_messages_sent > 0 THEN
    v_response_rate := LEAST(v_messages_received::DECIMAL / v_messages_sent, 1.0);
    v_response_rate_score := ROUND(v_response_rate * 300);
  ELSE
    v_response_rate_score := 0;
  END IF;

  -- 3. Calcular score de engajamento e negociação (0-300 pontos)
  SELECT
    COUNT(*) FILTER (WHERE status = 'broken'),
    COUNT(*) FILTER (WHERE status = 'kept')
  INTO v_broken_promises, v_successful_negotiations
  FROM payment_promises
  WHERE owner_id = p_owner_id;

  IF v_broken_promises > 0 THEN
    v_engagement_score := GREATEST(0, 150 - (v_broken_promises * 30)); -- Penalizar promessas quebradas
  ELSE
    v_engagement_score := 150;
  END IF;

  v_engagement_score := v_engagement_score + (v_successful_negotiations * 20); -- Bonificar negociações bem-sucedidas
  v_engagement_score := LEAST(v_engagement_score, 300); -- Cap em 300

  -- Score total (0-1000)
  v_score := v_payment_history_score + v_response_rate_score + v_engagement_score;

  -- Determinar nível de risco
  v_risk_level := CASE
    WHEN v_score >= 800 THEN 'very_low'
    WHEN v_score >= 600 THEN 'low'
    WHEN v_score >= 400 THEN 'medium'
    WHEN v_score >= 200 THEN 'high'
    ELSE 'very_high'
  END;

  -- Calcular probabilidade de pagamento (0-100%)
  v_payment_probability := LEAST(v_score::DECIMAL / 10, 100);

  -- Salvar ou atualizar score
  INSERT INTO debtor_scores (
    owner_id,
    administrator_id,
    overall_score,
    risk_level,
    payment_history_score,
    response_rate_score,
    engagement_score,
    total_charges,
    paid_charges,
    overdue_charges,
    messages_sent_to,
    messages_received_from,
    response_rate,
    broken_promises,
    successful_negotiations,
    payment_probability,
    calculated_at
  ) VALUES (
    p_owner_id,
    p_administrator_id,
    v_score,
    v_risk_level,
    v_payment_history_score,
    v_response_rate_score,
    v_engagement_score,
    v_total_charges,
    v_paid_charges,
    v_overdue_charges,
    v_messages_sent,
    v_messages_received,
    v_response_rate * 100,
    v_broken_promises,
    v_successful_negotiations,
    v_payment_probability,
    NOW()
  )
  ON CONFLICT (owner_id, administrator_id)
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    risk_level = EXCLUDED.risk_level,
    payment_history_score = EXCLUDED.payment_history_score,
    response_rate_score = EXCLUDED.response_rate_score,
    engagement_score = EXCLUDED.engagement_score,
    total_charges = EXCLUDED.total_charges,
    paid_charges = EXCLUDED.paid_charges,
    overdue_charges = EXCLUDED.overdue_charges,
    messages_sent_to = EXCLUDED.messages_sent_to,
    messages_received_from = EXCLUDED.messages_received_from,
    response_rate = EXCLUDED.response_rate,
    broken_promises = EXCLUDED.broken_promises,
    successful_negotiations = EXCLUDED.successful_negotiations,
    payment_probability = EXCLUDED.payment_probability,
    calculated_at = NOW(),
    updated_at = NOW();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function para verificar promessas quebradas
CREATE OR REPLACE FUNCTION check_broken_promises()
RETURNS INTEGER AS $$
DECLARE
  v_broken_count INTEGER := 0;
BEGIN
  UPDATE payment_promises
  SET status = 'broken'
  WHERE status = 'pending'
    AND promised_date < CURRENT_DATE
    AND payment_id IS NULL;

  GET DIAGNOSTICS v_broken_count = ROW_COUNT;

  RETURN v_broken_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_debtor_scores_updated_at
  BEFORE UPDATE ON debtor_scores
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_payment_promises_updated_at
  BEFORE UPDATE ON payment_promises
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_behavior_patterns_updated_at
  BEFORE UPDATE ON behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- =====================================================
-- VIEWS
-- =====================================================

-- View de devedores de alto risco
CREATE OR REPLACE VIEW high_risk_debtors AS
SELECT
  ds.*,
  o.name AS owner_name,
  o.email,
  o.phone,
  o.cpf,
  SUM(c.amount) FILTER (WHERE c.status = 'overdue') AS total_overdue_amount,
  COUNT(c.id) FILTER (WHERE c.status = 'overdue') AS overdue_count
FROM debtor_scores ds
JOIN owners o ON o.id = ds.owner_id
LEFT JOIN charges c ON c.owner_id = ds.owner_id
WHERE ds.risk_level IN ('high', 'very_high')
  OR ds.payment_probability < 30
GROUP BY ds.id, o.id;

-- View de insights ativos
CREATE OR REPLACE VIEW active_insights AS
SELECT
  ai.*,
  o.name AS owner_name,
  c.amount AS charge_amount,
  c.due_date
FROM ai_insights ai
LEFT JOIN owners o ON o.id = ai.owner_id
LEFT JOIN charges c ON c.id = ai.charge_id
WHERE ai.status = 'active'
  AND (ai.expires_at IS NULL OR ai.expires_at > NOW())
ORDER BY ai.priority DESC, ai.confidence DESC;

-- View de promessas pendentes
CREATE OR REPLACE VIEW pending_payment_promises AS
SELECT
  pp.*,
  o.name AS owner_name,
  o.phone,
  c.amount AS charge_amount,
  c.due_date AS charge_due_date,
  (pp.promised_date - CURRENT_DATE) AS days_until_promise
FROM payment_promises pp
JOIN owners o ON o.id = pp.owner_id
JOIN charges c ON c.id = pp.charge_id
WHERE pp.status = 'pending'
  AND pp.promised_date >= CURRENT_DATE
ORDER BY pp.promised_date;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE debtor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sentiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scores" ON debtor_scores
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view sentiments" ON conversation_sentiments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view insights" ON ai_insights
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage insights" ON ai_insights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'collector')
    )
  );

COMMENT ON TABLE debtor_scores IS 'Scores de devedores calculados com base em comportamento e histórico';
COMMENT ON TABLE conversation_sentiments IS 'Análise de sentimento de conversas com IA';
COMMENT ON TABLE ai_insights IS 'Insights e recomendações gerados por IA';
COMMENT ON TABLE payment_promises IS 'Promessas de pagamento feitas por devedores (detectadas por IA ou manual)';
COMMENT ON TABLE behavior_patterns IS 'Padrões de comportamento detectados em devedores';
