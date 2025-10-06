-- Garantir que o bucket boletos seja público para a AI acessar
UPDATE storage.buckets 
SET public = true 
WHERE id = 'boletos';

-- Se não existir, criar
INSERT INTO storage.buckets (id, name, public)
VALUES ('boletos', 'boletos', true)
ON CONFLICT (id) DO UPDATE SET public = true;