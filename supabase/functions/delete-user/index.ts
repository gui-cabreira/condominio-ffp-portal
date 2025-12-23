import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, profileId } = await req.json();

    // Aceita tanto profileId quanto userId para compatibilidade
    const targetProfileId = profileId || userId;

    if (!targetProfileId) {
      throw new Error('Profile ID é obrigatório');
    }

    console.log('Deletando usuário com profile ID:', targetProfileId);

    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se o usuário que está fazendo a requisição é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Verificar se o usuário é admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError || !roles) {
      throw new Error('Sem permissão para deletar usuários');
    }

    // Buscar o profile para obter o user_id correto (referência ao auth.users)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email')
      .eq('id', targetProfileId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Erro ao buscar perfil:', profileError);
      throw new Error('Usuário não encontrado');
    }

    const authUserId = profile.user_id;
    const profileEmail = profile.email;
    console.log('Auth user ID encontrado:', authUserId);

    // Verificar se não está tentando deletar a si mesmo
    if (authUserId === user.id) {
      throw new Error('Você não pode deletar seu próprio usuário');
    }

    // Remover convites vinculados ao email (para permitir re-convidar e evitar inconsistências)
    if (profileEmail) {
      const { error: deleteInvitesError } = await supabaseAdmin
        .from('user_invitations')
        .delete()
        .eq('email', profileEmail);

      if (deleteInvitesError) {
        console.error('Erro ao deletar convites do usuário:', deleteInvitesError);
        throw new Error('Erro ao deletar convites do usuário');
      }
    }

    // Primeiro deletar roles usando o user_id correto
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', authUserId);

    if (deleteRolesError) {
      console.error('Erro ao deletar roles:', deleteRolesError);
      throw new Error('Erro ao deletar roles do usuário');
    }

    // Deletar perfil usando o id do profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetProfileId);

    if (deleteProfileError) {
      console.error('Erro ao deletar perfil:', deleteProfileError);
      throw new Error('Erro ao deletar perfil do usuário');
    }

    // Deletar do auth.users usando o user_id correto
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (deleteAuthError) {
      console.error('Erro ao deletar do auth.users:', deleteAuthError);
      throw new Error('Erro ao deletar usuário do sistema de autenticação');
    }

    console.log('Usuário deletado com sucesso:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro na função delete-user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao deletar usuário'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
