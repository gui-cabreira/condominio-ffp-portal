import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { email, role, invitedBy } = await req.json();
    
    console.log('Sending invitation to:', email, 'Role:', role);

    // Verificar se o usuário já está cadastrado
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Error checking existing user:', userError);
      throw userError;
    }

    if (existingUser) {
      return new Response(JSON.stringify({
        error: 'Usuário já cadastrado no sistema',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se já existe convite pendente
    const { data: existingInvitation, error: invitationError } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invitationError) {
      console.error('Error checking existing invitation:', invitationError);
      throw invitationError;
    }

    if (existingInvitation) {
      return new Response(JSON.stringify({
        error: 'Já existe um convite pendente para este email',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar convite
    const { data: invitation, error: createError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        role,
        invited_by: invitedBy
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating invitation:', createError);
      throw createError;
    }

    console.log('Invitation created:', invitation.id);

    // URL para aceitar o convite
    const invitationUrl = `${req.headers.get('origin')}/aceitar-convite?token=${invitation.invitation_token}`;

    // Preparar dados do email
    const roleNames = {
      'admin': 'Administrador',
      'employee': 'Funcionário',
      'supervisor': 'Supervisor'
    };

    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Convite para o Sistema FFP Advogados</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #d4af37; 
            color: #1f2937; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold;
            margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FFP Advogados</h1>
            <h2>Convite para o Sistema</h2>
        </div>
        <div class="content">
            <p>Olá!</p>
            <p>Você foi convidado(a) para fazer parte da equipe do sistema FFP Advogados como <strong>${roleNames[role] || role}</strong>.</p>
            <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
            <div style="text-align: center;">
                <a href="${invitationUrl}" class="button">Aceitar Convite</a>
            </div>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">${invitationUrl}</p>
            <p><strong>Importante:</strong> Este convite expira em 7 dias.</p>
            <p>Se você não solicitou este convite, pode ignorar este email.</p>
        </div>
        <div class="footer">
            <p>© 2024 FFP Advogados. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;

    // Simular envio de email (aqui você integraria com um serviço de email real)
    console.log('Email template prepared for:', email);
    console.log('Invitation URL:', invitationUrl);
    
    // TODO: Integrar com serviço de email (SendGrid, Resend, etc.)
    // Por enquanto, apenas retornamos sucesso com os dados do convite

    return new Response(JSON.stringify({
      success: true,
      invitationId: invitation.id,
      invitationUrl,
      email,
      role: roleNames[role] || role,
      expiresAt: invitation.expires_at,
      message: 'Convite criado com sucesso! (Email será enviado quando o serviço de email for configurado)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-user-invitation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});