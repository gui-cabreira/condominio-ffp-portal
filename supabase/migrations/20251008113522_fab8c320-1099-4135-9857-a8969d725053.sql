-- Adicionar campos de CPF e endereço à tabela units
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS owner_cpf TEXT,
ADD COLUMN IF NOT EXISTS owner_street TEXT,
ADD COLUMN IF NOT EXISTS owner_number TEXT,
ADD COLUMN IF NOT EXISTS owner_complement TEXT,
ADD COLUMN IF NOT EXISTS owner_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS owner_city TEXT,
ADD COLUMN IF NOT EXISTS owner_state TEXT,
ADD COLUMN IF NOT EXISTS owner_zip_code TEXT;