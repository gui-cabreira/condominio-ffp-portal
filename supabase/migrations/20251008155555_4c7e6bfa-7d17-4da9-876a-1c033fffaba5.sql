-- Habilitar extensões necessárias para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job cron para processar steps agendados a cada hora
SELECT cron.schedule(
  'process-workflow-steps',
  '0 * * * *', -- A cada hora
  $$
  SELECT
    net.http_post(
        url:='https://iugxnhdxbpzauqwkjtao.supabase.co/functions/v1/process-scheduled-steps',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Z3huaGR4YnB6YXVxd2tqdGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzY0MjMsImV4cCI6MjA2NzU1MjQyM30.E_Il5SgiHp3_mNllTnzel8DHL31I-FRTpFHZy3NyeE8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);