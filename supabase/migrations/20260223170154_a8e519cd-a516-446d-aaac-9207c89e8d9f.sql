
-- Add intent tracking columns to charges table for CRM intelligence
ALTER TABLE public.charges 
ADD COLUMN IF NOT EXISTS ai_intent text,
ADD COLUMN IF NOT EXISTS ai_intent_confidence numeric,
ADD COLUMN IF NOT EXISTS ai_recovery_score integer,
ADD COLUMN IF NOT EXISTS intended_payment_date date,
ADD COLUMN IF NOT EXISTS last_intent_at timestamp with time zone;

-- Add intent tracking to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS ai_intent text,
ADD COLUMN IF NOT EXISTS ai_intent_confidence numeric,
ADD COLUMN IF NOT EXISTS ai_recovery_score integer,
ADD COLUMN IF NOT EXISTS intended_payment_date date;

-- Create coaching_intents table for coach dashboard
CREATE TABLE IF NOT EXISTS public.coaching_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id),
  session_id uuid REFERENCES public.coaching_sessions(id),
  phone_number text NOT NULL,
  intent_type text NOT NULL,
  confidence numeric,
  entities jsonb DEFAULT '{}'::jsonb,
  message_content text,
  action_taken text,
  pipeline_stage_before text,
  pipeline_stage_after text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and assistants can manage intents"
ON public.coaching_intents FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view intents"
ON public.coaching_intents FOR SELECT
USING (auth.role() = 'authenticated');
