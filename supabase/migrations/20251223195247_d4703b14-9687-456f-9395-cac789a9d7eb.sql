-- Criar tabela de estágios do pipeline CRM
CREATE TABLE public.crm_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280',
  position INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir estágios padrão de cobrança
INSERT INTO public.crm_pipeline_stages (name, display_name, description, color, position, is_final) VALUES
  ('novo', 'Novo', 'Cobrança recém criada, sem contato ainda', '#6B7280', 0, false),
  ('contato_inicial', 'Contato Inicial', 'Primeiro contato realizado com o devedor', '#3B82F6', 1, false),
  ('em_negociacao', 'Em Negociação', 'Negociação em andamento', '#F59E0B', 2, false),
  ('acordo_fechado', 'Acordo Fechado', 'Acordo formalizado, aguardando pagamento', '#8B5CF6', 3, false),
  ('pagamento_pendente', 'Pagamento Pendente', 'Aguardando confirmação do pagamento', '#EC4899', 4, false),
  ('quitado', 'Quitado', 'Pagamento confirmado e processo encerrado', '#10B981', 5, true);

-- Adicionar coluna pipeline_stage nas cobranças
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'novo';

-- Adicionar coluna para última interação
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna para próxima ação programada
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna para descrição da próxima ação
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS next_action_description TEXT;

-- Enable RLS
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view pipeline stages"
ON public.crm_pipeline_stages
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage pipeline stages"
ON public.crm_pipeline_stages
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));