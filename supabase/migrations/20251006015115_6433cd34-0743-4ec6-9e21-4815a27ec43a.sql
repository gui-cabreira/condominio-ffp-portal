-- Adicionar campos de acesso ao portal na tabela administrators
ALTER TABLE public.administrators 
  ADD COLUMN IF NOT EXISTS portal_url text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS portal_password text;

-- Criar tabela de contatos das administradoras
CREATE TABLE IF NOT EXISTS public.administrator_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_administrator_contacts_admin ON public.administrator_contacts(administrator_id);

-- RLS para administrator_contacts
ALTER TABLE public.administrator_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all contacts"
ON public.administrator_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Employees can view contacts"
ON public.administrator_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('employee', 'assistant', 'supervisor')
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_administrator_contacts_updated_at
BEFORE UPDATE ON public.administrator_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();