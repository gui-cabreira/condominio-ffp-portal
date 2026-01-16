-- Adicionar campos para instâncias autônomas
ALTER TABLE uazapi_instances
ADD COLUMN IF NOT EXISTS is_autonomous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_field_01 TEXT,
ADD COLUMN IF NOT EXISTS admin_field_02 TEXT,
ADD COLUMN IF NOT EXISTS auto_reply_delay_ms INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '["messages", "messages_update", "connection"]'::jsonb,
ADD COLUMN IF NOT EXISTS agent_personality TEXT DEFAULT 'professional';

-- Criar tabela de templates de mensagem
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'whatsapp',
  category TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policies para message_templates
CREATE POLICY "Authenticated users can read templates" 
ON message_templates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert templates" 
ON message_templates FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates" 
ON message_templates FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete templates" 
ON message_templates FOR DELETE 
TO authenticated 
USING (true);

-- Inserir template padrão de cobrança inicial
INSERT INTO message_templates (name, template_type, category, content, variables, is_default, is_active)
VALUES (
  'Cobrança Inicial',
  'whatsapp',
  'cobranca',
  'Olá {nome}! 👋

Sou do escritório *FFP Advogados* e estou entrando em contato sobre a taxa condominial do *{condominio}*.

📋 *Unidade:* {unidade}
💰 *Valor:* {valor}
📅 *Vencimento:* {vencimento}

Envio o boleto em anexo para pagamento.

Caso já tenha realizado o pagamento, por favor me envie o comprovante.

Posso te ajudar com algo mais? 🤝',
  ARRAY['{nome}', '{condominio}', '{unidade}', '{valor}', '{vencimento}', '{link_boleto}', '{codigo_pix}'],
  true,
  true
);

-- Template para lembrete
INSERT INTO message_templates (name, template_type, category, content, variables, is_default, is_active)
VALUES (
  'Lembrete de Pagamento',
  'whatsapp',
  'lembrete',
  '⏰ *Lembrete de Pagamento*

Olá {nome}!

Passando para lembrar da taxa condominial pendente:

📋 *Unidade:* {unidade}
💰 *Valor:* {valor}
📅 *Vencimento:* {vencimento}

Precisa de uma 2ª via do boleto ou deseja negociar?

Estou à disposição!',
  ARRAY['{nome}', '{unidade}', '{valor}', '{vencimento}'],
  false,
  true
);

-- Template para negociação
INSERT INTO message_templates (name, template_type, category, content, variables, is_default, is_active)
VALUES (
  'Proposta de Negociação',
  'whatsapp',
  'negociacao',
  '💰 *Proposta de Negociação*

Olá {nome}!

Analisamos seu caso e temos uma proposta:

📋 *Débito Original:* {valor_original}
✨ *Com Desconto:* {valor_desconto} ({percentual_desconto}% off)
📊 *Parcelamento:* {parcelas}x de {valor_parcela}

Deseja aceitar esta proposta?
Responda *SIM* para confirmar ou *NÃO* para recusar.',
  ARRAY['{nome}', '{valor_original}', '{valor_desconto}', '{percentual_desconto}', '{parcelas}', '{valor_parcela}'],
  false,
  true
);