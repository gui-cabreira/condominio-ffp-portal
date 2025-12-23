-- 1. Tabela de conversas do WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  awaiting_response_type TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  last_message_from TEXT DEFAULT 'customer',
  unread_count INTEGER DEFAULT 0,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de mensagens do WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  uazapi_message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  sender_phone TEXT,
  recipient_phone TEXT,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  caption TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Log de webhooks para auditoria
CREATE TABLE public.whatsapp_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  instance_id TEXT,
  phone_number TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de solicitações de boleto
CREATE TABLE public.boleto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES public.charges(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  requested_by TEXT,
  status TEXT DEFAULT 'pending',
  boleto_url TEXT,
  pix_code TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de comprovantes de pagamento
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES public.charges(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'pending',
  analyzed_at TIMESTAMPTZ,
  analyzed_by UUID,
  ai_analysis JSONB,
  ai_confidence NUMERIC,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de templates de mensagens
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boleto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Admins and assistants can manage conversations"
ON public.whatsapp_conversations FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view conversations"
ON public.whatsapp_conversations FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for whatsapp_messages
CREATE POLICY "Admins and assistants can manage messages"
ON public.whatsapp_messages FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view messages"
ON public.whatsapp_messages FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for whatsapp_webhooks_log
CREATE POLICY "Admins can manage webhooks log"
ON public.whatsapp_webhooks_log FOR ALL
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view webhooks log"
ON public.whatsapp_webhooks_log FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for boleto_requests
CREATE POLICY "Admins and assistants can manage boleto requests"
ON public.boleto_requests FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view boleto requests"
ON public.boleto_requests FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for payment_proofs
CREATE POLICY "Admins and assistants can manage payment proofs"
ON public.payment_proofs FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view payment proofs"
ON public.payment_proofs FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for whatsapp_templates
CREATE POLICY "Admins can manage templates"
ON public.whatsapp_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view templates"
ON public.whatsapp_templates FOR SELECT
USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_unit ON public.whatsapp_conversations(unit_id);
CREATE INDEX idx_whatsapp_conversations_charge ON public.whatsapp_conversations(charge_id);
CREATE INDEX idx_whatsapp_conversations_last_message ON public.whatsapp_conversations(last_message_at DESC);

CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_uazapi ON public.whatsapp_messages(uazapi_message_id);

CREATE INDEX idx_payment_proofs_charge ON public.payment_proofs(charge_id);
CREATE INDEX idx_payment_proofs_status ON public.payment_proofs(status);

CREATE INDEX idx_boleto_requests_charge ON public.boleto_requests(charge_id);
CREATE INDEX idx_boleto_requests_status ON public.boleto_requests(status);

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.whatsapp_templates (name, category, content, variables) VALUES
('Cobrança Inicial', 'cobranca', 'Olá {{nome}}! 👋

Identificamos que você possui um débito em aberto referente ao condomínio {{condominio}}.

📋 *Detalhes:*
• Unidade: {{unidade}}
• Valor: R$ {{valor}}
• Vencimento: {{vencimento}}

Para regularizar sua situação, responda esta mensagem ou entre em contato conosco.

_Atenciosamente, Equipe de Cobrança_', ARRAY['nome', 'condominio', 'unidade', 'valor', 'vencimento']),

('Envio de Boleto', 'cobranca', 'Aqui está seu boleto atualizado! 📄

💰 *Valor:* R$ {{valor}}
📅 *Vencimento:* {{vencimento}}

🔗 Link do boleto: {{boleto_url}}

📱 *PIX (Copia e Cola):*
```{{pix_code}}```

Qualquer dúvida, estamos à disposição!', ARRAY['valor', 'vencimento', 'boleto_url', 'pix_code']),

('Lembrete de Vencimento', 'cobranca', '⏰ *Lembrete de Vencimento*

Olá {{nome}}!

Seu boleto vence {{dias_para_vencer}}. Para evitar juros e multa, efetue o pagamento o quanto antes.

💰 Valor: R$ {{valor}}

Precisa de ajuda? Responda esta mensagem!', ARRAY['nome', 'dias_para_vencer', 'valor']),

('Confirmação de Comprovante', 'pagamento', '✅ *Comprovante Recebido*

Obrigado por enviar o comprovante, {{nome}}!

Estamos analisando e em breve confirmaremos a quitação do seu débito.

🕐 Prazo de análise: até 24 horas úteis', ARRAY['nome']),

('Pagamento Confirmado', 'pagamento', '🎉 *Pagamento Confirmado!*

Olá {{nome}}!

Confirmamos o recebimento do seu pagamento referente à unidade {{unidade}}.

✅ Valor: R$ {{valor}}
📅 Data: {{data_pagamento}}

Obrigado por regularizar sua situação!

_Sua quitação está registrada em nosso sistema._', ARRAY['nome', 'unidade', 'valor', 'data_pagamento']),

('Proposta de Negociação', 'negociacao', '💬 *Proposta de Negociação*

Olá {{nome}}!

Entendemos que podem existir dificuldades. Por isso, preparamos uma proposta especial:

📋 *Débito Original:* R$ {{valor_original}}
💰 *Proposta:* R$ {{valor_proposta}}
📊 *Desconto:* {{desconto}}%
📅 *Parcelas:* {{parcelas}}x de R$ {{valor_parcela}}

Deseja aceitar esta proposta? Responda com SIM ou NÃO.', ARRAY['nome', 'valor_original', 'valor_proposta', 'desconto', 'parcelas', 'valor_parcela']);