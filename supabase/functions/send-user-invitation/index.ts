import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

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
        status: 200,
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
        status: 200,
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
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ffpadvogados.com.br';
    const invitationUrl = `${frontendUrl}/aceitar-convite?token=${invitation.invitation_token}`;

    // Preparar dados do email
    const roleNames = {
      'admin': 'Administrador',
      'employee': 'Funcionário',
      'supervisor': 'Supervisor'
    };

    const emailTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para o Portal FFP Advogados</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1e293b;
            background: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header { 
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            padding: 48px 32px;
            text-align: center;
        }
        .logo { 
            width: 120px;
            height: 120px;
            margin: 0 auto 24px;
            background: #ffffff;
            border-radius: 16px;
            padding: 20px;
            display: block;
        }
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .content { 
            padding: 40px 32px;
            background: #ffffff;
        }
        .greeting {
            font-size: 18px;
            color: #1e293b;
            margin-bottom: 24px;
            font-weight: 500;
        }
        .message {
            font-size: 16px;
            color: #475569;
            margin-bottom: 16px;
            line-height: 1.7;
        }
        .role-badge {
            display: inline-block;
            background: linear-gradient(135deg, #d4af37 0%, #c99a2e 100%);
            color: #1e293b;
            padding: 8px 20px;
            border-radius: 24px;
            font-weight: 600;
            font-size: 15px;
            margin: 8px 0;
            letter-spacing: 0.3px;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #d4af37 0%, #c99a2e 100%);
            color: #1e293b;
            padding: 16px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
            letter-spacing: 0.3px;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }
        .link-box {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            word-break: break-all;
            font-size: 13px;
            color: #64748b;
            font-family: 'Courier New', monospace;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
            font-size: 15px;
        }
        .warning-text {
            color: #78350f;
            font-size: 14px;
            margin: 0;
        }
        .footer { 
            background: #f8fafc;
            text-align: center;
            padding: 32px;
            border-top: 1px solid #e2e8f0;
        }
        .footer-text {
            color: #64748b;
            font-size: 13px;
            margin: 0;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${frontendUrl}/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" alt="FFP Advogados" class="logo" />
            <h1>Convite para o Portal Corporativo</h1>
        </div>
        <div class="content">
            <p class="greeting">Olá! 👋</p>
            <p class="message">
                Você foi convidado(a) para fazer parte da equipe do <strong>Portal Corporativo FFP Advogados</strong>.
            </p>
            <p class="message">
                Sua função no sistema será: <span class="role-badge">${roleNames[role] || role}</span>
            </p>
            
            <div class="divider"></div>
            
            <p class="message">
                Para aceitar o convite e criar sua conta de acesso, clique no botão abaixo:
            </p>
            
            <div class="button-container">
                <a href="${invitationUrl}" class="button">✓ Aceitar Convite e Criar Conta</a>
            </div>
            
            <p class="message" style="text-align: center; font-size: 14px; color: #94a3b8;">
                Ou copie e cole este link no seu navegador:
            </p>
            <div class="link-box">${invitationUrl}</div>
            
            <div class="warning">
                <p class="warning-title">⏱️ Atenção: Prazo de Validade</p>
                <p class="warning-text">Este convite expira em <strong>7 dias</strong>. Após este período, será necessário solicitar um novo convite.</p>
            </div>
            
            <div class="divider"></div>
            
            <p class="message" style="font-size: 14px; color: #94a3b8;">
                Se você não solicitou este convite ou não reconhece esta ação, pode ignorar este email com segurança.
            </p>
        </div>
        <div class="footer">
            <p class="footer-text">© ${new Date().getFullYear()} FFP Advogados. Todos os direitos reservados.</p>
            <p class="footer-text" style="margin-top: 8px;">Portal Corporativo - Sistema de Gestão Condominial</p>
        </div>
    </div>
</body>
</html>`;

    // Enviar email via Resend
    console.log('Enviando email via Resend para:', email);
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'FFP Advogados <contato@ffpadvogados.com.br>',
      to: [email],
      subject: '[FFPAdvogados] - Convite de Acesso ao Portal Corporativo',
      html: emailTemplate,
      tags: [
        { name: 'category', value: 'user_invitation' },
        { name: 'invitation_id', value: invitation.id }
      ]
    });

    if (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Deletar convite se email falhou
      await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);
      
      throw new Error(`Erro ao enviar email: ${emailError.message}`);
    }

    console.log('Email enviado com sucesso! ID:', emailData?.id);

    // Atualizar convite com email_id e sent_at
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({
        email_id: emailData?.id,
        sent_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Erro ao atualizar convite:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      invitationId: invitation.id,
      invitationUrl,
      email,
      role: roleNames[role] || role,
      expiresAt: invitation.expires_at,
      emailId: emailData?.id,
      message: 'Convite enviado com sucesso!'
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