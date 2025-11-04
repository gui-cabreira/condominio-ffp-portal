-- Criar tabela de sistemas de gestão
CREATE TABLE IF NOT EXISTS public.management_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  csv_format JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna management_system_id na tabela administrators
ALTER TABLE public.administrators 
ADD COLUMN IF NOT EXISTS management_system_id UUID REFERENCES public.management_systems(id);

-- Inserir Superlógica como primeiro sistema
INSERT INTO public.management_systems (name, description, csv_format) 
VALUES (
  'Superlógica',
  'Sistema de gestão condominial Superlógica',
  '{
    "unit_pattern": "^\"\\d{4}\\s+[A-Z0-9]+\\s+-\\s+",
    "charge_fields": ["vencimento", "competencia", "atraso", "codigo", "principal", "juros", "multa", "atualizacao", "honorarios", "total"],
    "encoding": "ISO-8859-1"
  }'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.management_systems ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para management_systems
CREATE POLICY "Admins can manage systems"
  ON public.management_systems
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view systems"
  ON public.management_systems
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'employee'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_management_systems_updated_at
  BEFORE UPDATE ON public.management_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.management_systems IS 'Sistemas de gestão condominial (Superlógica, etc)';
COMMENT ON COLUMN public.administrators.management_system_id IS 'Sistema de gestão usado pela administradora';