-- Criar tabela de administradoras parceiras
CREATE TABLE public.administrators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  cnpj text,
  address text,
  contact_person text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS na tabela de administradoras
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para administradoras
CREATE POLICY "Admins can manage all administrators" 
ON public.administrators 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view administrators" 
ON public.administrators 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- Adicionar referência de administradora na tabela de condomínios
ALTER TABLE public.condominiums 
ADD COLUMN administrator_id uuid REFERENCES public.administrators(id);

-- Criar tabela para histórico de importações de cobranças
CREATE TABLE public.charge_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  administrator_id uuid NOT NULL REFERENCES public.administrators(id),
  file_name text,
  original_content text NOT NULL,
  processed_content jsonb,
  total_charges integer DEFAULT 0,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  error_log text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS na tabela de importações
ALTER TABLE public.charge_imports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para importações
CREATE POLICY "Admins can manage all imports" 
ON public.charge_imports 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view imports" 
ON public.charge_imports 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- Adicionar campos extras na tabela de cobranças para rastreamento
ALTER TABLE public.charges 
ADD COLUMN import_id uuid REFERENCES public.charge_imports(id),
ADD COLUMN administrator_id uuid REFERENCES public.administrators(id);

-- Trigger para atualizar updated_at nas administradoras
CREATE TRIGGER update_administrators_updated_at
BEFORE UPDATE ON public.administrators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_administrators_active ON public.administrators(active);
CREATE INDEX idx_administrators_email ON public.administrators(email);
CREATE INDEX idx_charge_imports_status ON public.charge_imports(status);
CREATE INDEX idx_charge_imports_administrator ON public.charge_imports(administrator_id);
CREATE INDEX idx_charges_import_id ON public.charges(import_id);
CREATE INDEX idx_charges_administrator_id ON public.charges(administrator_id);