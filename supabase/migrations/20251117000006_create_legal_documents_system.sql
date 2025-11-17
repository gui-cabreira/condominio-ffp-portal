-- =====================================================
-- SISTEMA DE DOCUMENTOS JURÍDICOS E ESCALAÇÃO JUDICIAL
-- =====================================================

-- Tabela de processos judiciais/extrajudiciais
CREATE TABLE legal_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES administrators(id),

  process_type TEXT NOT NULL CHECK (process_type IN (
    'notification', -- Notificação extrajudicial
    'protest', -- Protesto em cartório
    'small_claims', -- Juizado Especial
    'civil_lawsuit', -- Ação de cobrança
    'foreclosure', -- Execução
    'mediation', -- Mediação
    'arbitration' -- Arbitragem
  )),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'filed', -- Protocolado
    'served', -- Notificado/Citado
    'contested', -- Contestado
    'judgment', -- Em julgamento
    'won', -- Ganho
    'lost', -- Perdido
    'settled', -- Acordo
    'cancelled'
  )),

  -- Valores
  principal_amount DECIMAL(15,2) NOT NULL, -- Valor principal
  interest_amount DECIMAL(15,2) DEFAULT 0, -- Juros
  fees_amount DECIMAL(15,2) DEFAULT 0, -- Honorários advocatícios
  court_costs DECIMAL(15,2) DEFAULT 0, -- Custas processuais
  total_amount DECIMAL(15,2) NOT NULL, -- Valor total

  -- Dados do processo
  process_number TEXT, -- Número do processo (CNJ)
  court_name TEXT, -- Nome do fórum/vara
  filing_date DATE, -- Data de protocolo
  service_date DATE, -- Data de citação
  judgment_date DATE, -- Data da sentença
  settlement_date DATE, -- Data do acordo

  -- Advogado/Escritório
  lawyer_id UUID REFERENCES users(id),
  law_firm_name TEXT,
  law_firm_oab TEXT,

  -- Timeline de prazos
  deadlines JSONB, -- Array de prazos: [{"type": "contestation", "date": "2024-01-15", "status": "pending"}]

  -- Documentos gerados
  generated_documents UUID[], -- Array de IDs de documentos

  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_legal_processes_owner ON legal_processes(owner_id);
CREATE INDEX idx_legal_processes_charge ON legal_processes(charge_id);
CREATE INDEX idx_legal_processes_status ON legal_processes(status);
CREATE INDEX idx_legal_processes_type ON legal_processes(process_type);
CREATE INDEX idx_legal_processes_filing_date ON legal_processes(filing_date);

-- Tabela de templates de documentos jurídicos
CREATE TABLE legal_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'notification_letter', -- Carta de notificação
    'demand_letter', -- Carta de cobrança
    'protest_letter', -- Carta de protesto
    'initial_petition', -- Petição inicial
    'contestation', -- Contestação
    'appeal', -- Recurso
    'settlement_agreement', -- Acordo
    'power_of_attorney', -- Procuração
    'payment_plan', -- Plano de pagamento
    'receipt', -- Recibo
    'custom'
  )),

  content TEXT NOT NULL, -- Template em formato markdown/HTML
  variables JSONB, -- Variáveis disponíveis no template

  administrator_id UUID REFERENCES administrators(id), -- NULL = template global
  is_system BOOLEAN DEFAULT false, -- Templates do sistema não podem ser deletados

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de documentos gerados
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES legal_processes(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES charges(id),
  owner_id UUID REFERENCES owners(id),

  template_id UUID REFERENCES legal_document_templates(id),
  document_type TEXT NOT NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Documento final gerado
  file_url TEXT, -- URL do PDF gerado

  -- Assinaturas
  requires_signature BOOLEAN DEFAULT false,
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  signature_id TEXT, -- ID na plataforma de assinatura (Clicksign, DocuSign, etc)

  -- Controle
  generated_by UUID REFERENCES users(id),
  generated_with_ai BOOLEAN DEFAULT false,
  ai_model TEXT,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_documents_process ON legal_documents(process_id);
CREATE INDEX idx_legal_documents_owner ON legal_documents(owner_id);
CREATE INDEX idx_legal_documents_type ON legal_documents(document_type);

-- Tabela de prazos processuais
CREATE TABLE legal_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES legal_processes(id) ON DELETE CASCADE,

  deadline_type TEXT NOT NULL CHECK (deadline_type IN (
    'contestation', -- Prazo para contestação
    'appeal', -- Prazo para recurso
    'evidence', -- Prazo para provas
    'manifestation', -- Prazo para manifestação
    'compliance', -- Prazo para cumprimento
    'payment', -- Prazo para pagamento
    'hearing', -- Data de audiência
    'judgment', -- Data de sentença
    'custom'
  )),

  description TEXT NOT NULL,
  deadline_date DATE NOT NULL,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'extended')),

  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_deadlines_process ON legal_deadlines(process_id);
CREATE INDEX idx_legal_deadlines_date ON legal_deadlines(deadline_date);
CREATE INDEX idx_legal_deadlines_status ON legal_deadlines(status);

-- Tabela de cartórios de protesto
CREATE TABLE protest_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,

  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Custos
  base_fee DECIMAL(10,2),
  percentage_fee DECIMAL(5,2),

  -- Integração
  has_api BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  api_credentials JSONB,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de protestos
CREATE TABLE protests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_process_id UUID REFERENCES legal_processes(id),
  charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id),

  protest_office_id UUID REFERENCES protest_offices(id),

  amount DECIMAL(15,2) NOT NULL,
  fees DECIMAL(10,2),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'protested', -- Protestado
    'paid', -- Pago
    'withdrawn', -- Retirado
    'cancelled'
  )),

  protocol_number TEXT, -- Número de protocolo
  protest_number TEXT, -- Número do protesto
  protest_date DATE,
  payment_date DATE,
  withdrawal_date DATE,

  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protests_charge ON protests(charge_id);
CREATE INDEX idx_protests_owner ON protests(owner_id);
CREATE INDEX idx_protests_status ON protests(status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function para calcular valores do processo
CREATE OR REPLACE FUNCTION calculate_legal_process_amount(
  p_principal DECIMAL,
  p_interest_rate DECIMAL DEFAULT 1.0, -- 1% ao mês
  p_months_overdue INTEGER DEFAULT 1,
  p_lawyer_fee_percentage DECIMAL DEFAULT 10.0 -- 10%
)
RETURNS TABLE (
  principal_amount DECIMAL,
  interest_amount DECIMAL,
  fees_amount DECIMAL,
  total_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY SELECT
    p_principal,
    ROUND(p_principal * (p_interest_rate / 100) * p_months_overdue, 2),
    ROUND(p_principal * (p_lawyer_fee_percentage / 100), 2),
    ROUND(
      p_principal +
      (p_principal * (p_interest_rate / 100) * p_months_overdue) +
      (p_principal * (p_lawyer_fee_percentage / 100)),
      2
    );
END;
$$ LANGUAGE plpgsql;

-- Function para gerar número CNJ do processo (exemplo simplificado)
CREATE OR REPLACE FUNCTION generate_process_number()
RETURNS TEXT AS $$
DECLARE
  year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  sequential INTEGER := floor(random() * 9999999 + 1000000)::INTEGER;
  segment TEXT := '8'; -- 8 = Justiça Estadual
  court TEXT := '02'; -- Exemplo: SP
  origin TEXT := '0001'; -- Origem
BEGIN
  -- Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  -- Simplificado para exemplo
  RETURN format('%07d-%02d.%d.%s.%s.%s',
    sequential,
    MOD(sequential, 97), -- Dígito verificador simplificado
    year,
    segment,
    court,
    origin
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger para adicionar documento ao processo
CREATE OR REPLACE FUNCTION add_document_to_process()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.process_id IS NOT NULL THEN
    UPDATE legal_processes
    SET generated_documents = array_append(
      COALESCE(generated_documents, ARRAY[]::UUID[]),
      NEW.id
    )
    WHERE id = NEW.process_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_document_to_process
  AFTER INSERT ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION add_document_to_process();

-- Trigger para verificar prazos vencidos
CREATE OR REPLACE FUNCTION check_missed_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE legal_deadlines
  SET status = 'missed'
  WHERE status = 'pending'
    AND deadline_date < CURRENT_DATE;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger de updated_at
CREATE TRIGGER update_legal_processes_updated_at
  BEFORE UPDATE ON legal_processes
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_legal_document_templates_updated_at
  BEFORE UPDATE ON legal_document_templates
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_legal_deadlines_updated_at
  BEFORE UPDATE ON legal_deadlines
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_protest_offices_updated_at
  BEFORE UPDATE ON protest_offices
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_protests_updated_at
  BEFORE UPDATE ON protests
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- =====================================================
-- VIEWS
-- =====================================================

-- View de processos ativos
CREATE OR REPLACE VIEW active_legal_processes AS
SELECT
  lp.*,
  o.name AS owner_name,
  o.cpf,
  c.amount AS charge_amount,
  c.due_date AS charge_due_date,
  COUNT(DISTINCT ld.id) AS document_count,
  COUNT(DISTINCT ldl.id) FILTER (WHERE ldl.status = 'pending') AS pending_deadlines
FROM legal_processes lp
JOIN owners o ON o.id = lp.owner_id
LEFT JOIN charges c ON c.id = lp.charge_id
LEFT JOIN legal_documents ld ON ld.process_id = lp.id
LEFT JOIN legal_deadlines ldl ON ldl.process_id = lp.id
WHERE lp.status NOT IN ('cancelled', 'won', 'lost', 'settled')
GROUP BY lp.id, o.id, c.id;

-- View de prazos próximos
CREATE OR REPLACE VIEW upcoming_deadlines AS
SELECT
  ld.*,
  lp.process_number,
  lp.process_type,
  o.name AS owner_name,
  (ld.deadline_date - CURRENT_DATE) AS days_until_deadline
FROM legal_deadlines ld
JOIN legal_processes lp ON lp.id = ld.process_id
JOIN owners o ON o.id = lp.owner_id
WHERE ld.status = 'pending'
  AND ld.deadline_date >= CURRENT_DATE
  AND ld.deadline_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ld.deadline_date;

-- =====================================================
-- SEED DATA - Templates de Documentos
-- =====================================================

INSERT INTO legal_document_templates (name, document_type, content, variables, is_system) VALUES
(
  'Notificação Extrajudicial de Cobrança',
  'notification_letter',
  '# NOTIFICAÇÃO EXTRAJUDICIAL DE COBRANÇA

**Notificante:** {administradora_nome}
**CNPJ:** {administradora_cnpj}
**Endereço:** {administradora_endereco}

**Notificado(a):** {devedor_nome}
**CPF:** {devedor_cpf}
**Endereço:** {devedor_endereco}

---

## ASSUNTO: Cobrança de Débito Condominial

{devedor_nome}, portador(a) do CPF {devedor_cpf}, proprietário(a) da unidade {unidade}, localizada no {condominio}, vem por meio desta NOTIFICAR Vossa Senhoria sobre o débito pendente conforme descrito abaixo:

### DÉBITO:

- **Competência:** {competencia}
- **Data de Vencimento:** {vencimento}
- **Valor Principal:** {valor_principal}
- **Juros e Multa:** {juros_multa}
- **Valor Total Atualizado:** {valor_total}
- **Dias em Atraso:** {dias_atraso}

### PROVIDÊNCIAS:

Fica Vossa Senhoria **NOTIFICADO(A)** a regularizar o débito acima no prazo de **10 (dez) dias** a contar do recebimento desta, sob pena de:

1. Protesto do título em Cartório;
2. Inclusão do nome nos órgãos de proteção ao crédito (SPC/SERASA);
3. Cobrança judicial com incidência de honorários advocatícios.

### PAGAMENTO:

O pagamento poderá ser realizado através de:
- **PIX:** {pix}
- **Boleto:** {link_boleto}
- **Transferência:** {dados_bancarios}

Para negociação de parcelamento, entre em contato através de {contato}.

---

**Local e Data:** {cidade}, {data_extenso}

**{administradora_nome}**
CNPJ: {administradora_cnpj}

---

*Documento gerado automaticamente pelo FFP Portal*',
  '{
    "administradora_nome": "Nome da administradora",
    "administradora_cnpj": "CNPJ da administradora",
    "administradora_endereco": "Endereço completo",
    "devedor_nome": "Nome do devedor",
    "devedor_cpf": "CPF do devedor",
    "devedor_endereco": "Endereço do devedor",
    "unidade": "Número da unidade",
    "condominio": "Nome do condomínio",
    "competencia": "Mês/ano de competência",
    "vencimento": "Data de vencimento",
    "valor_principal": "Valor principal",
    "juros_multa": "Juros e multa",
    "valor_total": "Valor total atualizado",
    "dias_atraso": "Dias em atraso",
    "pix": "Chave PIX",
    "link_boleto": "Link do boleto",
    "dados_bancarios": "Dados bancários",
    "contato": "Telefone/email para contato",
    "cidade": "Cidade",
    "data_extenso": "Data por extenso"
  }',
  true
),
(
  'Carta de Protesto',
  'protest_letter',
  '# APRESENTAÇÃO PARA PROTESTO

**Apresentante:** {administradora_nome}
**CNPJ:** {administradora_cnpj}

**Devedor:** {devedor_nome}
**CPF:** {devedor_cpf}
**Endereço:** {devedor_endereco}

---

## TÍTULO A SER PROTESTADO

**Natureza:** Cobrança de débito condominial
**Valor:** R$ {valor_total}
**Vencimento:** {vencimento}
**Competência:** {competencia}

## FUNDAMENTAÇÃO

Trata-se de débito condominial referente à unidade {unidade} do {condominio}, devidamente comprovado através de documentação anexa.

O débito encontra-se vencido há {dias_atraso} dias, tendo o devedor sido previamente notificado em {data_notificacao} sem obter resposta.

## PEDIDO

Diante do exposto, requer-se o protesto do presente título pelo valor de **R$ {valor_total}** ({valor_total_extenso}), com todas as cominações legais.

---

**Data:** {data}

**{administradora_nome}**
CNPJ: {administradora_cnpj}',
  '{}',
  true
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE legal_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE protest_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE protests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view legal processes" ON legal_processes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view templates" ON legal_document_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view documents" ON legal_documents
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE legal_processes IS 'Processos judiciais e extrajudiciais de cobrança';
COMMENT ON TABLE legal_document_templates IS 'Templates de documentos jurídicos';
COMMENT ON TABLE legal_documents IS 'Documentos jurídicos gerados';
COMMENT ON TABLE legal_deadlines IS 'Prazos processuais';
COMMENT ON TABLE protest_offices IS 'Cartórios de protesto';
COMMENT ON TABLE protests IS 'Protestos em cartório';
