-- Dropar e recriar função accept_invitation com nomes de parâmetros sem ambiguidade
DROP FUNCTION IF EXISTS public.accept_invitation(uuid, uuid);

CREATE FUNCTION public.accept_invitation(
  p_invitation_token uuid, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation_record record;
BEGIN
  -- Buscar o convite válido
  SELECT * INTO v_invitation_record
  FROM public.user_invitations
  WHERE invitation_token = p_invitation_token
    AND expires_at > now()
    AND accepted_at IS NULL;
  
  -- Se não encontrar convite válido, retornar false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Marcar convite como aceito
  UPDATE public.user_invitations
  SET accepted_at = now()
  WHERE id = v_invitation_record.id;
  
  -- Atribuir role ao usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_invitation_record.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;