-- Create condominiums table
CREATE TABLE public.condominiums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  total_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(condominium_id, unit_number)
);

-- Create charges table
CREATE TABLE public.charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  description TEXT,
  reference_month DATE, -- mes de referencia da cobrança
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for tracking communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms', 'letter')),
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'responded', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for condominiums
CREATE POLICY "Admins can manage all condominiums" 
ON public.condominiums 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view condominiums" 
ON public.condominiums 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- RLS Policies for units
CREATE POLICY "Admins can manage all units" 
ON public.units 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view units" 
ON public.units 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- RLS Policies for charges
CREATE POLICY "Admins can manage all charges" 
ON public.charges 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view charges" 
ON public.charges 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- RLS Policies for messages
CREATE POLICY "Admins can manage all messages" 
ON public.messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Supervisors can view messages" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_condominiums_updated_at
BEFORE UPDATE ON public.condominiums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_charges_updated_at
BEFORE UPDATE ON public.charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create useful views for statistics
CREATE VIEW public.defaulter_statistics AS
SELECT 
  c.id as condominium_id,
  c.name as condominium_name,
  COUNT(DISTINCT u.id) as total_units,
  COUNT(DISTINCT CASE WHEN ch.status IN ('pending', 'overdue') THEN u.id END) as defaulter_units,
  COUNT(DISTINCT CASE WHEN ch.status = 'paid' THEN u.id END) as paid_units,
  COALESCE(SUM(CASE WHEN ch.status IN ('pending', 'overdue') THEN ch.amount ELSE 0 END), 0) as total_pending_amount,
  COALESCE(SUM(CASE WHEN ch.status = 'paid' THEN ch.amount ELSE 0 END), 0) as total_paid_amount
FROM public.condominiums c
LEFT JOIN public.units u ON c.id = u.condominium_id
LEFT JOIN public.charges ch ON u.id = ch.unit_id 
  AND ch.reference_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY c.id, c.name;

CREATE VIEW public.message_statistics AS
SELECT 
  c.id as condominium_id,
  c.name as condominium_name,
  COUNT(m.id) as total_messages_sent,
  COUNT(CASE WHEN m.opened_at IS NOT NULL THEN 1 END) as messages_opened,
  COUNT(CASE WHEN m.responded_at IS NOT NULL THEN 1 END) as messages_responded,
  COUNT(CASE WHEN m.opened_at IS NULL THEN 1 END) as messages_not_opened
FROM public.condominiums c
LEFT JOIN public.units u ON c.id = u.condominium_id
LEFT JOIN public.messages m ON u.id = m.unit_id 
  AND m.sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.name;

-- Insert sample data for testing
INSERT INTO public.condominiums (name, address, total_units, created_by) VALUES 
('Condomínio Villa Real', 'Rua das Flores, 123', 120, (SELECT id FROM auth.users WHERE email = 'carla@ffpadvogados.com.br')),
('Residencial Jardins', 'Av. Paulista, 456', 80, (SELECT id FROM auth.users WHERE email = 'carla@ffpadvogados.com.br')),
('Edifício Central Park', 'Rua Augusta, 789', 200, (SELECT id FROM auth.users WHERE email = 'wilson@ffpadvogados.com.br')),
('Condomínio Sunset', 'Av. Rebouças, 321', 60, (SELECT id FROM auth.users WHERE email = 'wilson@ffpadvogados.com.br'));

-- Insert sample units (only a few for demonstration)
INSERT INTO public.units (condominium_id, unit_number, owner_name, owner_email, owner_phone) 
SELECT 
  c.id,
  'Apto ' || generate_series(1, LEAST(c.total_units, 10)),
  'Proprietário ' || generate_series(1, LEAST(c.total_units, 10)),
  'proprietario' || generate_series(1, LEAST(c.total_units, 10)) || '@email.com',
  '(11) 9999-' || LPAD(generate_series(1000, 1000 + LEAST(c.total_units, 10) - 1)::text, 4, '0')
FROM public.condominiums c;

-- Insert sample charges
INSERT INTO public.charges (unit_id, amount, due_date, status, description, reference_month)
SELECT 
  u.id,
  (RANDOM() * 500 + 200)::DECIMAL(10,2),
  CURRENT_DATE + (RANDOM() * 30 - 15)::INTEGER,
  CASE 
    WHEN RANDOM() < 0.6 THEN 'paid'
    WHEN RANDOM() < 0.8 THEN 'pending' 
    ELSE 'overdue'
  END,
  'Taxa condominial',
  DATE_TRUNC('month', CURRENT_DATE)
FROM public.units u;

-- Insert sample messages
INSERT INTO public.messages (unit_id, charge_id, type, content, sent_at, opened_at, status)
SELECT 
  u.id,
  ch.id,
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'whatsapp'
    WHEN 1 THEN 'email'
    ELSE 'sms'
  END,
  'Lembrete de cobrança condominial',
  CURRENT_TIMESTAMP - (RANDOM() * 30)::INTEGER * INTERVAL '1 day',
  CASE WHEN RANDOM() < 0.7 THEN CURRENT_TIMESTAMP - (RANDOM() * 20)::INTEGER * INTERVAL '1 day' ELSE NULL END,
  CASE WHEN RANDOM() < 0.7 THEN 'opened' ELSE 'sent' END
FROM public.units u
JOIN public.charges ch ON u.id = ch.unit_id;