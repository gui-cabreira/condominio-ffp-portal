-- =============================================
-- MIGRATION: Complete Database Schema (Fixed Order)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.user_role AS ENUM ('admin', 'assistant', 'employee', 'supervisor');
CREATE TYPE public.charge_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.message_type AS ENUM ('email', 'whatsapp', 'sms');
CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- =============================================
-- USER ROLES TABLE (First, no dependencies)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  birth_date DATE,
  rg TEXT,
  cpf TEXT,
  zip_code TEXT,
  street TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  complement TEXT,
  avatar_url TEXT,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- USER INVITATIONS TABLE
-- =============================================
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  email_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  tracking_events JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" ON public.user_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- LOGIN LOGS TABLE
-- =============================================
CREATE TABLE public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  success BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login logs" ON public.login_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can insert login logs" ON public.login_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- MANAGEMENT SYSTEMS TABLE
-- =============================================
CREATE TABLE public.management_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  csv_format JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.management_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view management systems" ON public.management_systems
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage management systems" ON public.management_systems
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default management system
INSERT INTO public.management_systems (name, description, csv_format) VALUES 
('Superlógica', 'Sistema de gestão Superlógica', '{"unit_pattern": "^\"\\d{4}\\s+[A-Z0-9]+\\s+-\\s+", "charge_fields": ["vencimento", "competencia", "atraso", "historico", "principal", "juros", "multa", "honorarios", "correcao", "total"], "encoding": "utf-8"}');

-- =============================================
-- ADMINISTRATORS TABLE
-- =============================================
CREATE TABLE public.administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cnpj TEXT,
  address TEXT,
  contact_person TEXT,
  fantasy_name TEXT,
  legal_name TEXT,
  legal_nature TEXT,
  opening_date TEXT,
  status TEXT,
  size TEXT,
  capital TEXT,
  main_activity TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  portal_url TEXT,
  portal_username TEXT,
  portal_password TEXT,
  management_system_id UUID REFERENCES public.management_systems(id),
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view administrators" ON public.administrators
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage administrators" ON public.administrators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- ADMINISTRATOR CONTACTS TABLE
-- =============================================
CREATE TABLE public.administrator_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.administrator_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contacts" ON public.administrator_contacts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage contacts" ON public.administrator_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- CONDOMINIUMS TABLE
-- =============================================
CREATE TABLE public.condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  total_units INTEGER DEFAULT 0,
  administrator_id UUID REFERENCES public.administrators(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view condominiums" ON public.condominiums
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage condominiums" ON public.condominiums
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- UNITS TABLE
-- =============================================
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  block TEXT,
  tower TEXT,
  owner_name TEXT,
  owner_cpf TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_street TEXT,
  owner_number TEXT,
  owner_complement TEXT,
  owner_neighborhood TEXT,
  owner_city TEXT,
  owner_state TEXT,
  owner_zip_code TEXT,
  tenant_name TEXT,
  tenant_cpf TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  is_rented BOOLEAN DEFAULT false,
  fraction DECIMAL(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view units" ON public.units
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage units" ON public.units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- CHARGES TABLE
-- =============================================
CREATE TABLE public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES public.administrators(id),
  workflow_id UUID,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status public.charge_status DEFAULT 'pending',
  reference_month TEXT,
  description TEXT,
  principal_amount DECIMAL(12, 2),
  interest_amount DECIMAL(12, 2),
  interest_rate DECIMAL(5, 4),
  fine_amount DECIMAL(12, 2),
  fees_rate DECIMAL(5, 4),
  total_with_fees DECIMAL(12, 2),
  correction_amount DECIMAL(12, 2),
  attorney_fees DECIMAL(12, 2),
  boleto_url TEXT,
  boleto_barcode TEXT,
  pix_code TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view charges" ON public.charges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage charges" ON public.charges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- CHARGE TIMELINE TABLE
-- =============================================
CREATE TABLE public.charge_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.charge_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view timeline" ON public.charge_timeline
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage timeline" ON public.charge_timeline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- CHARGE IMPORTS TABLE
-- =============================================
CREATE TABLE public.charge_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID REFERENCES public.administrators(id),
  condominium_id UUID REFERENCES public.condominiums(id),
  file_name TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  total_charges INTEGER DEFAULT 0,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.charge_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view imports" ON public.charge_imports
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage imports" ON public.charge_imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- NEGOTIATION PARAMETERS TABLE
-- =============================================
CREATE TABLE public.negotiation_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key TEXT NOT NULL UNIQUE,
  parameter_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.negotiation_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view parameters" ON public.negotiation_parameters
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage parameters" ON public.negotiation_parameters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default parameters
INSERT INTO public.negotiation_parameters (parameter_key, parameter_value, description) VALUES 
('interest_rate', '0.01', 'Taxa de juros mensal padrão'),
('fine_rate', '0.02', 'Taxa de multa padrão'),
('attorney_fee_rate', '0.10', 'Taxa de honorários advocatícios');

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  type public.message_type NOT NULL,
  status public.message_status DEFAULT 'pending',
  recipient TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  template_id TEXT,
  external_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view messages" ON public.messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and assistants can manage messages" ON public.messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- =============================================
-- WORKFLOWS TABLE
-- =============================================
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflows" ON public.workflows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflows" ON public.workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- WORKFLOW NODES TABLE
-- =============================================
CREATE TABLE public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  type TEXT NOT NULL,
  position_x DECIMAL,
  position_y DECIMAL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow nodes" ON public.workflow_nodes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflow nodes" ON public.workflow_nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- WORKFLOW EDGES TABLE
-- =============================================
CREATE TABLE public.workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  source_handle TEXT,
  target_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow edges" ON public.workflow_edges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflow edges" ON public.workflow_edges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- WORKFLOW EXECUTIONS TABLE
-- =============================================
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.charges(id),
  status TEXT DEFAULT 'pending',
  current_node TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow executions" ON public.workflow_executions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflow executions" ON public.workflow_executions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- WORKFLOW LOOP CONFIGS TABLE
-- =============================================
CREATE TABLE public.workflow_loop_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  loop_id TEXT NOT NULL,
  max_iterations INTEGER DEFAULT 10,
  delay_hours INTEGER DEFAULT 24,
  exit_condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_loop_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view loop configs" ON public.workflow_loop_configs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage loop configs" ON public.workflow_loop_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- STATISTICS TABLES
-- =============================================
CREATE TABLE public.defaulter_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_defaulters INTEGER DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  recovered_amount DECIMAL(15, 2) DEFAULT 0,
  recovery_rate DECIMAL(5, 2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.defaulter_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view statistics" ON public.defaulter_statistics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE public.login_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_logins INTEGER DEFAULT 0,
  successful_logins INTEGER DEFAULT 0,
  failed_logins INTEGER DEFAULT 0,
  period DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login statistics" ON public.login_statistics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TABLE public.message_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_responded INTEGER DEFAULT 0,
  message_type public.message_type,
  period DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view message statistics" ON public.message_statistics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE public.units_limited (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id),
  limited_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units_limited ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view limited units" ON public.units_limited
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- TRIGGER FUNCTION FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_management_systems_updated_at BEFORE UPDATE ON public.management_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_administrators_updated_at BEFORE UPDATE ON public.administrators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_administrator_contacts_updated_at BEFORE UPDATE ON public.administrator_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_condominiums_updated_at BEFORE UPDATE ON public.condominiums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_negotiation_parameters_updated_at BEFORE UPDATE ON public.negotiation_parameters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();