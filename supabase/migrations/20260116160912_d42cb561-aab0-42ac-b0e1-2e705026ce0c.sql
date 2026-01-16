-- Criar ENUM para tipos de cobrança
CREATE TYPE charge_type AS ENUM (
  'regular',        -- Cobrança normal de condomínio
  'inadimplencia',  -- Cobrança em atraso
  'acordo',         -- Parcela de acordo
  'extrajudicial'   -- Cobrança extrajudicial
);

-- Criar tabela de acordos (antes de adicionar FK em charges)
CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  administrator_id uuid REFERENCES administrators(id) ON DELETE SET NULL,
  agreement_date date NOT NULL,
  total_amount numeric NOT NULL,
  original_debt numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  total_installments integer NOT NULL,
  paid_installments integer DEFAULT 0,
  status text DEFAULT 'active',
  original_charges jsonb DEFAULT '[]'::jsonb,
  terms text,
  external_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de casos extrajudiciais
CREATE TABLE public.extrajudicial_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  administrator_id uuid REFERENCES administrators(id) ON DELETE SET NULL,
  case_date date NOT NULL,
  case_number text,
  total_amount numeric NOT NULL,
  attorney_name text,
  attorney_contact text,
  status text DEFAULT 'open',
  related_charges jsonb DEFAULT '[]'::jsonb,
  notes text,
  deadline_date date,
  settlement_date date,
  settlement_amount numeric,
  external_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar novas colunas na tabela charges
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS charge_type charge_type DEFAULT 'regular';
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES agreements(id) ON DELETE SET NULL;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS extrajudicial_case_id uuid REFERENCES extrajudicial_cases(id) ON DELETE SET NULL;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS installment_number integer;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS external_id text;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_charges_charge_type ON charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_agreement_id ON charges(agreement_id);
CREATE INDEX IF NOT EXISTS idx_charges_extrajudicial_case_id ON charges(extrajudicial_case_id);
CREATE INDEX IF NOT EXISTS idx_charges_external_id ON charges(external_id);
CREATE INDEX IF NOT EXISTS idx_agreements_unit_id ON agreements(unit_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_external_id ON agreements(external_id);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_unit_id ON extrajudicial_cases(unit_id);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_status ON extrajudicial_cases(status);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_external_id ON extrajudicial_cases(external_id);

-- RLS para agreements
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agreements" 
ON public.agreements FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins and assistants can manage agreements" 
ON public.agreements FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

-- RLS para extrajudicial_cases
ALTER TABLE public.extrajudicial_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extrajudicial cases" 
ON public.extrajudicial_cases FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins and assistants can manage extrajudicial cases" 
ON public.extrajudicial_cases FOR ALL 
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

-- Trigger para updated_at em agreements
CREATE TRIGGER update_agreements_updated_at
BEFORE UPDATE ON public.agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em extrajudicial_cases
CREATE TRIGGER update_extrajudicial_cases_updated_at
BEFORE UPDATE ON public.extrajudicial_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();