-- 1. Corrigir trigger handle_new_user para NÃO criar role automaticamente
-- A role será criada pelo fluxo de convite ou cadastro normal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- NÃO criar role aqui automaticamente como 'employee'
  -- A role será criada:
  -- 1. Pelo AcceptInvitation quando aceitar convite (com a role do convite)
  -- 2. Pelo fluxo de cadastro normal (se necessário)
  
  RETURN NEW;
END;
$$;

-- 2. Adicionar política para permitir que usuários criem sua própria role inicial
-- Isso é necessário para o fluxo de AcceptInvitation funcionar
CREATE POLICY "Users can create their own initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Criar bucket de avatars se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de storage para avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);