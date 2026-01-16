-- Tabela para rastrear todos os emails enviados
CREATE TABLE public.email_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email_id TEXT NOT NULL UNIQUE,
    recipient TEXT NOT NULL,
    subject TEXT,
    email_type TEXT NOT NULL DEFAULT 'notification',
    related_entity_type TEXT,
    related_entity_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    complained_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    tracking_events JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_email_tracking_email_id ON public.email_tracking(email_id);
CREATE INDEX idx_email_tracking_recipient ON public.email_tracking(recipient);
CREATE INDEX idx_email_tracking_email_type ON public.email_tracking(email_type);
CREATE INDEX idx_email_tracking_related ON public.email_tracking(related_entity_type, related_entity_id);

-- Trigger para updated_at
CREATE TRIGGER update_email_tracking_updated_at
    BEFORE UPDATE ON public.email_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

-- Policy para usuários autenticados visualizarem
CREATE POLICY "Authenticated users can view email tracking"
    ON public.email_tracking FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy para inserção via service role
CREATE POLICY "Service role can insert email tracking"
    ON public.email_tracking FOR INSERT
    WITH CHECK (true);

-- Policy para update via service role  
CREATE POLICY "Service role can update email tracking"
    ON public.email_tracking FOR UPDATE
    USING (true);

-- Adicionar coluna api_openai nas secrets se não existir
-- Nota: Vamos usar LOVABLE_API_KEY para IA