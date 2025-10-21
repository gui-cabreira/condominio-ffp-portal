-- Tabela para armazenar conversas WhatsApp
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  unit_id UUID REFERENCES units(id),
  charge_id UUID REFERENCES charges(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting_proof', 'resolved', 'expired')),
  conversation_state JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_from TEXT CHECK (last_message_from IN ('customer', 'system', 'admin')),
  awaiting_response_type TEXT CHECK (awaiting_response_type IN ('proof', 'confirmation', 'query', NULL)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conv_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conv_charge ON whatsapp_conversations(charge_id);
CREATE INDEX idx_whatsapp_conv_status ON whatsapp_conversations(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela para armazenar mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  uazapi_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_phone TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
  content TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  media_filename TEXT,
  local_file_path TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_msg_conv ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_msg_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_msg_created ON whatsapp_messages(created_at DESC);

-- Tabela para comprovantes de pagamento
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) NOT NULL,
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  message_id UUID REFERENCES whatsapp_messages(id),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  thumbnail_path TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  ai_analysis JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_proofs_charge ON payment_proofs(charge_id);
CREATE INDEX idx_payment_proofs_status ON payment_proofs(verification_status);
CREATE INDEX idx_payment_proofs_created ON payment_proofs(created_at DESC);

-- Tabela para links de pagamento
CREATE TABLE charge_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES charges(id) NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  full_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_links_short_code ON charge_payment_links(short_code);
CREATE INDEX idx_payment_links_charge ON charge_payment_links(charge_id);

-- Tabela para log de webhooks (debug e auditoria)
CREATE TABLE whatsapp_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_log_created ON whatsapp_webhooks_log(created_at DESC);
CREATE INDEX idx_webhooks_log_processed ON whatsapp_webhooks_log(processed);

-- RLS Policies para whatsapp_conversations
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all conversations"
  ON whatsapp_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage conversations"
  ON whatsapp_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies para whatsapp_messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all messages"
  ON whatsapp_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage messages"
  ON whatsapp_messages FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies para payment_proofs
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment proofs"
  ON payment_proofs FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create proofs"
  ON payment_proofs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies para charge_payment_links
ALTER TABLE charge_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active links"
  ON charge_payment_links FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Admins can manage links"
  ON charge_payment_links FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create links"
  ON charge_payment_links FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies para whatsapp_webhooks_log
ALTER TABLE whatsapp_webhooks_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON whatsapp_webhooks_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage webhook logs"
  ON whatsapp_webhooks_log FOR ALL
  USING (auth.role() = 'service_role');

-- Criar storage bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies para payment-proofs
CREATE POLICY "Admins can view payment proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "System can upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'service_role');

CREATE POLICY "System can update payment proofs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE whatsapp_conversations IS 'Armazena conversas ativas do WhatsApp com clientes';
COMMENT ON TABLE whatsapp_messages IS 'Histórico completo de mensagens enviadas e recebidas via WhatsApp';
COMMENT ON TABLE payment_proofs IS 'Comprovantes de pagamento enviados pelos clientes via WhatsApp';
COMMENT ON TABLE charge_payment_links IS 'Links únicos e curtos para pagamento de cobranças';
COMMENT ON TABLE whatsapp_webhooks_log IS 'Log de todos webhooks recebidos do UAZAPI para debug e auditoria';