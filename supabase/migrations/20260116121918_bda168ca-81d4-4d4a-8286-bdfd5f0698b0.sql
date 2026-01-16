-- Campos para soft delete e aprendizado em mensagens
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS used_for_training BOOLEAN DEFAULT FALSE;

-- Tabela de base de conhecimento para Qdrant
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES uazapi_instances(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES administrators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('document', 'qa', 'conversation', 'faq')),
  source_id TEXT,
  embedding_id TEXT,
  is_vectorized BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuração de instância IA
CREATE TABLE IF NOT EXISTS whatsapp_instance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES uazapi_instances(id) ON DELETE CASCADE UNIQUE,
  operation_type TEXT CHECK (operation_type IN ('cobranca', 'atendimento', 'coach')) DEFAULT 'cobranca',
  operation_mode TEXT CHECK (operation_mode IN ('autonomous', 'notifications', 'hybrid')) DEFAULT 'autonomous',
  intentions TEXT[] DEFAULT ARRAY['cobranca'],
  ai_personality TEXT DEFAULT 'professional',
  working_hours JSONB DEFAULT '{"start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}',
  away_message TEXT DEFAULT 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve.',
  daily_message_limit INTEGER DEFAULT 1000,
  blacklist TEXT[] DEFAULT ARRAY[]::TEXT[],
  whitelist TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_learn BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de aprendizado
CREATE TABLE IF NOT EXISTS ai_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES uazapi_instances(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  quality_score NUMERIC(3,2) DEFAULT 0.5,
  feedback TEXT,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT FALSE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_instance ON ai_knowledge_base(instance_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_vectorized ON ai_knowledge_base(is_vectorized);
CREATE INDEX IF NOT EXISTS idx_learning_history_instance ON ai_learning_history(instance_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON whatsapp_messages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_training ON whatsapp_messages(used_for_training) WHERE used_for_training = TRUE;

-- RLS
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_history ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_knowledge_base
CREATE POLICY "Users can view knowledge base" ON ai_knowledge_base FOR SELECT USING (true);
CREATE POLICY "Users can manage knowledge base" ON ai_knowledge_base FOR ALL USING (true);

-- Políticas para whatsapp_instance_config
CREATE POLICY "Users can view instance config" ON whatsapp_instance_config FOR SELECT USING (true);
CREATE POLICY "Users can manage instance config" ON whatsapp_instance_config FOR ALL USING (true);

-- Políticas para ai_learning_history
CREATE POLICY "Users can view learning history" ON ai_learning_history FOR SELECT USING (true);
CREATE POLICY "Users can manage learning history" ON ai_learning_history FOR ALL USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_ai_knowledge_base_updated_at BEFORE UPDATE ON ai_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_instance_config_updated_at BEFORE UPDATE ON whatsapp_instance_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();