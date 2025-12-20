import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Atualizar senha se usuário já existe
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      );

      if (updateError) {
        console.error("Erro ao atualizar usuário:", updateError);
        throw updateError;
      }

      // Garantir que o perfil está aprovado e atualizado
      await supabaseAdmin
        .from("profiles")
        .update({
          first_name: firstName || "Guilherme",
          last_name: lastName || "Cabreira",
          approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("user_id", existingUser.id);

      // Garantir role admin
      await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: existingUser.id,
          role: role || "admin",
        }, { onConflict: "user_id" });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário atualizado com sucesso",
          userId: existingUser.id 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Criar novo usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || "Guilherme",
        last_name: lastName || "Cabreira",
      },
    });

    if (authError) {
      console.error("Erro ao criar usuário:", authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Usuário não foi criado");
    }

    // Aguardar trigger criar o perfil
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Atualizar perfil para aprovado
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: firstName || "Guilherme",
        last_name: lastName || "Cabreira",
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq("user_id", authData.user.id);

    if (profileError) {
      console.error("Erro ao atualizar perfil:", profileError);
    }

    // Atualizar role para admin
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: role || "admin" })
      .eq("user_id", authData.user.id);

    if (roleError) {
      console.error("Erro ao atualizar role:", roleError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário admin criado com sucesso",
        userId: authData.user.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
