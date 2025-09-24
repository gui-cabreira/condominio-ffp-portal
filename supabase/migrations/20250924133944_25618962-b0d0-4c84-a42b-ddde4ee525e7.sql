-- Criar tabela para convites de usuários (para enviar convites por email)
CREATE TABLE public.user_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role user_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  invitation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de convites
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para convites
CREATE POLICY "Admins can manage all invitations" 
ON public.user_invitations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Criar função para aceitar convite
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
BEGIN
  -- Buscar o convite válido
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE user_invitations.invitation_token = accept_invitation.invitation_token
    AND expires_at > now()
    AND accepted_at IS NULL;
  
  -- Se não encontrar convite válido, retornar false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Marcar convite como aceito
  UPDATE public.user_invitations
  SET accepted_at = now()
  WHERE id = invitation_record.id;
  
  -- Atribuir role ao usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, invitation_record.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Criar índices para performance
CREATE INDEX idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- Atualizar as políticas existentes para incluir o role de employee
CREATE POLICY "Employees can view condominiums" 
ON public.condominiums 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Employees can view units" 
ON public.units 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Employees can manage charges" 
ON public.charges 
FOR ALL 
USING (has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Employees can manage messages" 
ON public.messages 
FOR ALL 
USING (has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Employees can view administrators" 
ON public.administrators 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Employees can view imports" 
ON public.charge_imports 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::user_role));