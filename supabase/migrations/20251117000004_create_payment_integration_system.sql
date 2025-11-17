-- =====================================================
-- SISTEMA DE INTEGRAÇÃO COM MEIOS DE PAGAMENTO
-- =====================================================

-- Tabela de configurações de gateway de pagamento
CREATE TABLE payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('asaas', 'pagarme', 'mercadopago', 'stripe', 'banco_inter', 'sicoob', 'custom')),
  administrator_id UUID REFERENCES administrators(id),
  api_key_encrypted TEXT, -- Chave criptografada
  api_secret_encrypted TEXT,
  webhook_secret TEXT,
  configuration JSONB, -- Configurações específicas do provedor
  capabilities JSONB DEFAULT '{"pix": true, "boleto": true, "credit_card": true, "debit_card": false}'::jsonb,
  active BOOLEAN DEFAULT true,
  sandbox_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de métodos de pagamento gerados
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  gateway_id UUID REFERENCES payment_gateways(id),
  method_type TEXT NOT NULL CHECK (method_type IN ('pix', 'boleto', 'credit_card', 'debit_card', 'bank_transfer')),

  -- Dados PIX
  pix_qr_code TEXT, -- QR Code base64
  pix_qr_code_text TEXT, -- Código PIX copia e cola
  pix_expiration TIMESTAMPTZ,

  -- Dados Boleto
  boleto_barcode TEXT,
  boleto_digitable_line TEXT,
  boleto_url TEXT,
  boleto_due_date DATE,

  -- Dados Cartão
  card_installments INTEGER,
  card_brand TEXT,
  card_last_digits TEXT,

  -- Dados gerais
  amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  interest_amount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL,

  external_id TEXT, -- ID no gateway
  external_url TEXT, -- URL para pagamento (se aplicável)

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'expired', 'cancelled', 'failed')),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payment_methods_charge ON payment_methods(charge_id);
CREATE INDEX idx_payment_methods_status ON payment_methods(status);
CREATE INDEX idx_payment_methods_external_id ON payment_methods(external_id);

-- Tabela de transações de pagamento
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES charges(id),

  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'chargeback', 'fee')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  amount DECIMAL(15,2) NOT NULL,
  fee_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2),

  external_transaction_id TEXT,
  payment_date TIMESTAMPTZ,
  settlement_date TIMESTAMPTZ, -- Data de liquidação (quando cai na conta)

  payer_name TEXT,
  payer_document TEXT,
  payer_email TEXT,

  metadata JSONB,
  raw_response JSONB, -- Resposta completa do gateway

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payment_transactions_payment_method ON payment_transactions(payment_method_id);
CREATE INDEX idx_payment_transactions_charge ON payment_transactions(charge_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_date ON payment_transactions(payment_date);

-- Tabela de webhooks de pagamento (log)
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES payment_gateways(id),
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_payment_webhooks_gateway ON payment_webhooks(gateway_id);
CREATE INDEX idx_payment_webhooks_external_id ON payment_webhooks(external_id);

-- Tabela de links de pagamento
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id),

  short_code TEXT UNIQUE NOT NULL, -- Código curto para URL amigável
  url TEXT NOT NULL,

  allowed_methods TEXT[] DEFAULT ARRAY['pix', 'boleto', 'credit_card'], -- Métodos permitidos

  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(15,2),

  active BOOLEAN DEFAULT true,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payment_links_short_code ON payment_links(short_code);
CREATE INDEX idx_payment_links_charge ON payment_links(charge_id);

-- Tabela de ofertas de negociação/desconto
CREATE TABLE payment_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id),

  offer_type TEXT NOT NULL CHECK (offer_type IN ('discount', 'installment', 'combo')),

  -- Desconto
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(15,2),
  discount_description TEXT,

  -- Parcelamento
  installments INTEGER,
  installment_amount DECIMAL(15,2),
  installment_interest_rate DECIMAL(5,2) DEFAULT 0,

  original_amount DECIMAL(15,2) NOT NULL,
  final_amount DECIMAL(15,2) NOT NULL,

  valid_until TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  payment_link_id UUID REFERENCES payment_links(id),

  created_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_offers_charge ON payment_offers(charge_id);
CREATE INDEX idx_payment_offers_status ON payment_offers(status);
CREATE INDEX idx_payment_offers_valid_until ON payment_offers(valid_until);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function para gerar código curto único
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function para criar link de pagamento
CREATE OR REPLACE FUNCTION create_payment_link(
  p_charge_id UUID,
  p_expires_hours INTEGER DEFAULT 72,
  p_discount_percentage DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
  v_short_code TEXT;
  v_charge RECORD;
  v_base_url TEXT;
BEGIN
  -- Buscar informações da cobrança
  SELECT * INTO v_charge FROM charges WHERE id = p_charge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  -- Gerar código único
  LOOP
    v_short_code := generate_short_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM payment_links WHERE short_code = v_short_code);
  END LOOP;

  v_base_url := COALESCE(current_setting('app.public_url', true), 'https://ffp-portal.com');

  -- Criar link
  INSERT INTO payment_links (
    charge_id,
    owner_id,
    short_code,
    url,
    expires_at,
    discount_percentage
  ) VALUES (
    p_charge_id,
    v_charge.owner_id,
    v_short_code,
    v_base_url || '/pay/' || v_short_code,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    p_discount_percentage
  ) RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql;

-- Function para calcular valor com desconto
CREATE OR REPLACE FUNCTION calculate_discounted_amount(
  p_original_amount DECIMAL,
  p_discount_percentage DECIMAL DEFAULT NULL,
  p_discount_amount DECIMAL DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_discount DECIMAL := 0;
BEGIN
  IF p_discount_percentage IS NOT NULL THEN
    v_discount := p_original_amount * (p_discount_percentage / 100);
  ELSIF p_discount_amount IS NOT NULL THEN
    v_discount := p_discount_amount;
  END IF;

  RETURN GREATEST(p_original_amount - v_discount, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status da cobrança quando pagamento é confirmado
CREATE OR REPLACE FUNCTION update_charge_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Atualizar cobrança
    UPDATE charges
    SET
      status = 'paid',
      paid_at = NEW.paid_at,
      updated_at = NOW()
    WHERE id = NEW.charge_id;

    -- Registrar no timeline
    INSERT INTO charge_timeline (charge_id, event_type, description, metadata)
    VALUES (
      NEW.charge_id,
      'payment_received',
      'Pagamento confirmado via ' || NEW.method_type,
      jsonb_build_object(
        'payment_method_id', NEW.id,
        'amount', NEW.final_amount,
        'method', NEW.method_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_charge_on_payment
  AFTER UPDATE ON payment_methods
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION update_charge_on_payment();

-- Trigger para expirar ofertas
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE payment_offers
  SET status = 'expired'
  WHERE status = 'active'
    AND valid_until < NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON payment_gateways
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON payment_links
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER update_payment_offers_updated_at
  BEFORE UPDATE ON payment_offers
  FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

-- =====================================================
-- VIEWS
-- =====================================================

-- View de pagamentos recentes
CREATE OR REPLACE VIEW recent_payments AS
SELECT
  pm.id,
  pm.charge_id,
  c.owner_id,
  o.name AS owner_name,
  c.administrator_id,
  pm.method_type,
  pm.final_amount,
  pm.status,
  pm.paid_at,
  pm.created_at,
  pg.provider AS gateway_provider
FROM payment_methods pm
JOIN charges c ON c.id = pm.charge_id
JOIN owners o ON o.id = c.owner_id
LEFT JOIN payment_gateways pg ON pg.id = pm.gateway_id
WHERE pm.status IN ('paid', 'processing')
ORDER BY pm.paid_at DESC NULLS LAST;

-- View de estatísticas de pagamento
CREATE OR REPLACE VIEW payment_statistics AS
SELECT
  c.administrator_id,
  pm.method_type,
  DATE(pm.paid_at) AS payment_date,
  COUNT(*) AS total_transactions,
  SUM(pm.final_amount) AS total_amount,
  AVG(pm.final_amount) AS avg_amount,
  SUM(pt.fee_amount) AS total_fees,
  SUM(pt.net_amount) AS net_amount
FROM payment_methods pm
JOIN charges c ON c.id = pm.charge_id
LEFT JOIN payment_transactions pt ON pt.payment_method_id = pm.id
WHERE pm.status = 'paid'
GROUP BY c.administrator_id, pm.method_type, DATE(pm.paid_at);

-- View de ofertas ativas
CREATE OR REPLACE VIEW active_payment_offers AS
SELECT
  po.*,
  c.amount AS charge_amount,
  c.due_date,
  c.status AS charge_status,
  o.name AS owner_name,
  o.email AS owner_email,
  o.phone AS owner_phone
FROM payment_offers po
JOIN charges c ON c.id = po.charge_id
JOIN owners o ON o.id = c.owner_id
WHERE po.status = 'active'
  AND po.valid_until > NOW();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_offers ENABLE ROW LEVEL SECURITY;

-- Policies básicas
CREATE POLICY "Users can view payment methods" ON payment_methods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view transactions" ON payment_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Public can access payment links" ON payment_links
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- =====================================================
-- SEED DATA - Gateway Padrão
-- =====================================================

-- Inserir gateway padrão (Asaas - muito usado no Brasil para condominios)
INSERT INTO payment_gateways (name, provider, capabilities, active, sandbox_mode)
VALUES (
  'Gateway Padrão - Asaas',
  'asaas',
  '{"pix": true, "boleto": true, "credit_card": true, "debit_card": false, "bank_transfer": true}'::jsonb,
  false, -- Desativado por padrão até configurar
  true
);

COMMENT ON TABLE payment_gateways IS 'Configurações de gateways de pagamento (Asaas, PagarMe, etc)';
COMMENT ON TABLE payment_methods IS 'Métodos de pagamento gerados para cobranças (PIX, Boleto, Cartão)';
COMMENT ON TABLE payment_transactions IS 'Transações de pagamento efetivadas';
COMMENT ON TABLE payment_webhooks IS 'Log de webhooks recebidos dos gateways de pagamento';
COMMENT ON TABLE payment_links IS 'Links de pagamento gerados para facilitar pagamento do devedor';
COMMENT ON TABLE payment_offers IS 'Ofertas de desconto/parcelamento para negociação';
