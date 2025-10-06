-- Criar tabela de workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de nós do workflow
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL, -- 'start', 'message', 'delay', 'condition', 'loop'
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb, -- Armazena configurações específicas do nó
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_id)
);

-- Criar tabela de conexões entre nós
CREATE TABLE IF NOT EXISTS public.workflow_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  edge_type TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de execuções de workflow
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.charges(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'paused'
  current_node_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de passos da execução
CREATE TABLE IF NOT EXISTS public.workflow_execution_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de loops do workflow
CREATE TABLE IF NOT EXISTS public.workflow_loops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  max_iterations INTEGER NOT NULL DEFAULT 3,
  current_iteration INTEGER DEFAULT 0,
  condition_type TEXT, -- 'count', 'until_response', 'until_payment'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_loops ENABLE ROW LEVEL SECURITY;

-- Policies para workflows
CREATE POLICY "Usuários autenticados podem ver workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies para workflow_nodes
CREATE POLICY "Usuários autenticados podem ver nós"
  ON public.workflow_nodes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar nós"
  ON public.workflow_nodes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar nós"
  ON public.workflow_nodes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar nós"
  ON public.workflow_nodes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies para workflow_edges
CREATE POLICY "Usuários autenticados podem ver edges"
  ON public.workflow_edges FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar edges"
  ON public.workflow_edges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar edges"
  ON public.workflow_edges FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies para execuções
CREATE POLICY "Usuários autenticados podem ver execuções"
  ON public.workflow_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode criar execuções"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar execuções"
  ON public.workflow_executions FOR UPDATE
  USING (true);

-- Policies para execution_steps
CREATE POLICY "Usuários autenticados podem ver passos"
  ON public.workflow_execution_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode criar passos"
  ON public.workflow_execution_steps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar passos"
  ON public.workflow_execution_steps FOR UPDATE
  USING (true);

-- Policies para loops
CREATE POLICY "Usuários autenticados podem ver loops"
  ON public.workflow_loops FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar loops"
  ON public.workflow_loops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar loops"
  ON public.workflow_loops FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Triggers para updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_nodes_updated_at
  BEFORE UPDATE ON public.workflow_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
  BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_execution_steps_updated_at
  BEFORE UPDATE ON public.workflow_execution_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_loops_updated_at
  BEFORE UPDATE ON public.workflow_loops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow_id ON public.workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_execution_steps_execution_id ON public.workflow_execution_steps(execution_id);
CREATE INDEX idx_workflow_execution_steps_status ON public.workflow_execution_steps(status);
CREATE INDEX idx_workflow_execution_steps_scheduled_for ON public.workflow_execution_steps(scheduled_for);