import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY FIX: Verify request is from Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: validatedUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !validatedUser) {
      console.error('Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user, metadata } = await req.json();

    console.log('Sincronizando usuário Azure:', user.email);

    // Verificar se o perfil já existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      console.log('Perfil já existe, atualizando último login');
      
      // Registrar login
      await supabase.from('login_logs').insert({
        user_id: user.id,
        success: true,
        metadata: {
          method: 'azure_oauth',
          email: user.email,
          tenant_id: metadata?.tenant_id,
          timestamp: new Date().toISOString()
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: existingProfile,
          message: 'Login registrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar ou atualizar perfil para usuário Azure (UPSERT para evitar duplicatas)
    console.log('Criando/atualizando perfil para usuário Azure');
    
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.given_name || user.user_metadata?.name?.split(' ')[0] || '',
        last_name: user.user_metadata?.family_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        approved: true, // Usuários Azure são aprovados automaticamente
        profile_completed: false, // Precisam completar perfil
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Erro ao criar/atualizar perfil:', profileError);
      throw profileError;
    }

    // SECURITY FIX: Removed hardcoded email check for developer role
    // All Azure users default to 'employee' - admins must manually assign other roles
    const defaultRole = 'employee';

    // Verificar se já tem role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: defaultRole
        });

      if (roleError && roleError.code !== '23505') {
        console.error('Erro ao atribuir role:', roleError);
      }
    }

    // Registrar login
    await supabase.from('login_logs').insert({
      user_id: user.id,
      success: true,
      metadata: {
        method: 'azure_oauth',
        email: user.email,
        tenant_id: metadata?.tenant_id,
        first_login: true,
        timestamp: new Date().toISOString()
      }
    });

    // Registrar em system_logs
    await supabase.from('system_logs').insert({
      event_type: 'user_created',
      event_category: 'authentication',
      description: `Novo usuário Azure criado: ${user.email}`,
      user_id: user.id,
      metadata: {
        method: 'azure_oauth',
        role: defaultRole,
        auto_approved: true
      }
    });

    console.log('Perfil criado com sucesso, role:', defaultRole);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: newProfile,
        role: defaultRole,
        needs_completion: true,
        message: 'Perfil criado, completar cadastro necessário' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao sincronizar usuário Azure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});