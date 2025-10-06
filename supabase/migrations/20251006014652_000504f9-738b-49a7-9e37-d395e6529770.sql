-- Adicionar novos campos à tabela administrators para armazenar dados completos da ReceitaWS
ALTER TABLE public.administrators 
  ADD COLUMN IF NOT EXISTS fantasy_name text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_nature text,
  ADD COLUMN IF NOT EXISTS opening_date text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS capital text,
  ADD COLUMN IF NOT EXISTS main_activity text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text;