-- PARTE 1: Adicionar role 'developer' ao enum e colunas LGPD
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'developer';

-- Adicionar colunas LGPD à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lgpd_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lgpd_consent_date timestamptz;