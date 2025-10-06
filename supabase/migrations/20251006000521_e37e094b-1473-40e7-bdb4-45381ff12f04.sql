-- Criar bucket para armazenamento de boletos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('boletos', 'boletos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket de boletos
CREATE POLICY "Admins e employees podem ver boletos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'boletos' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
);

CREATE POLICY "Admins e employees podem upload boletos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'boletos' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
);

CREATE POLICY "Admins podem deletar boletos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'boletos' AND
  has_role(auth.uid(), 'admin'::user_role)
);