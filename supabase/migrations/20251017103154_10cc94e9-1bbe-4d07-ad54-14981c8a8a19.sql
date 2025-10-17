-- Criar bucket público para branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para permitir leitura pública
CREATE POLICY "Public access to branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Policy para admins fazerem upload
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);