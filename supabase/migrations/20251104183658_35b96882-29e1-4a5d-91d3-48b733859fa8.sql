-- Adicionar colunas number e complement à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT;