-- Add missing address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS property_type text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.number IS 'Número do endereço';
COMMENT ON COLUMN public.profiles.property_type IS 'Tipo de imóvel: casa, apartamento, sala_comercial, loja, galpao, terreno, sitio, outro';