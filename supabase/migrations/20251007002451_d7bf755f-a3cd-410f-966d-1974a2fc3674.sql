-- Adicionar campo de resposta/notas de resolução aos bugs
ALTER TABLE public.system_bugs
ADD COLUMN resolution_notes text;