-- Adicionar campo para controlar se o perfil foi completado
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Criar índice para melhorar performance nas queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed 
ON public.profiles(profile_completed) 
WHERE profile_completed = false;