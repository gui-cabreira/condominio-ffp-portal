-- Adicionar campo approved na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Adicionar campo approved_at para tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campo approved_by para auditoria
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Criar índice para buscar usuários não aprovados
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);

-- Atualizar usuários existentes como aprovados
UPDATE public.profiles SET approved = true WHERE approved IS NULL OR approved = false;

COMMENT ON COLUMN public.profiles.approved IS 'Indica se o usuário foi aprovado por um administrador';
COMMENT ON COLUMN public.profiles.approved_at IS 'Data e hora da aprovação';
COMMENT ON COLUMN public.profiles.approved_by IS 'ID do administrador que aprovou';