import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailData {
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
  user: {
    email: string;
    id: string;
  };
}

const getEmailTemplate = (type: string, data: AuthEmailData) => {
  const { token_hash, email_action_type, redirect_to } = data.email_data;
  const { email } = data.user;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

  switch (type) {
    case "recovery":
      return {
        subject: "Redefinir sua senha - FFP Advogados",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 40px 30px; }
                .content p { color: #374151; line-height: 1.6; margin: 0 0 20px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .button:hover { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); }
                .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px; }
                .warning p { color: #92400e; margin: 0; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Redefinir Senha</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Recebemos uma solicitação para redefinir a senha da sua conta em <strong>FFP Advogados</strong>.</p>
                  <p>Para criar uma nova senha, clique no botão abaixo:</p>
                  <center>
                    <a href="${confirmationUrl}" class="button">Redefinir Senha</a>
                  </center>
                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${confirmationUrl}" style="color: #3b82f6; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                  <div class="warning">
                    <p><strong>⚠️ Importante:</strong> Este link é válido por 1 hora e só pode ser usado uma vez.</p>
                  </div>
                  <p style="margin-top: 30px;">Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>
                </div>
                <div class="footer">
                  <p><strong>FFP Advogados</strong></p>
                  <p>Sistema de Gestão de Inadimplência</p>
                  <p style="margin-top: 10px;">Este é um email automático, por favor não responda.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "signup":
    case "invite":
      return {
        subject: "Confirme seu email - FFP Advogados",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 40px 30px; }
                .content p { color: #374151; line-height: 1.6; margin: 0 0 20px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .button:hover { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); }
                .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
                .info { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; border-radius: 4px; }
                .info p { color: #1e40af; margin: 0; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✉️ Confirme seu Email</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Bem-vindo ao sistema <strong>FFP Advogados</strong>!</p>
                  <p>Para ativar sua conta e começar a usar o sistema, precisamos confirmar seu endereço de email.</p>
                  <center>
                    <a href="${confirmationUrl}" class="button">Confirmar Email</a>
                  </center>
                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${confirmationUrl}" style="color: #3b82f6; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                  <div class="info">
                    <p><strong>ℹ️ Dica:</strong> Após confirmar seu email, você poderá acessar o sistema com suas credenciais.</p>
                  </div>
                  <p style="margin-top: 30px;">Se você não criou esta conta, ignore este email.</p>
                </div>
                <div class="footer">
                  <p><strong>FFP Advogados</strong></p>
                  <p>Sistema de Gestão de Inadimplência</p>
                  <p style="margin-top: 10px;">Este é um email automático, por favor não responda.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case "email_change":
      return {
        subject: "Confirme a alteração de email - FFP Advogados",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 40px 30px; }
                .content p { color: #374151; line-height: 1.6; margin: 0 0 20px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📧 Confirmar Alteração de Email</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Você solicitou a alteração do email da sua conta para <strong>${email}</strong>.</p>
                  <p>Para confirmar esta alteração, clique no botão abaixo:</p>
                  <center>
                    <a href="${confirmationUrl}" class="button">Confirmar Alteração</a>
                  </center>
                  <p style="margin-top: 30px;">Se você não solicitou esta alteração, ignore este email.</p>
                </div>
                <div class="footer">
                  <p><strong>FFP Advogados</strong></p>
                  <p>Sistema de Gestão de Inadimplência</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    default:
      return {
        subject: "Notificação do Sistema - FFP Advogados",
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif;">
              <p>Você recebeu uma notificação do sistema FFP Advogados.</p>
              <a href="${confirmationUrl}">Clique aqui para continuar</a>
            </body>
          </html>
        `,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AuthEmailData = await req.json();
    console.log("Auth email webhook received:", {
      type: payload.email_data.email_action_type,
      email: payload.user.email,
    });

    const emailTemplate = getEmailTemplate(
      payload.email_data.email_action_type,
      payload
    );

    const { data, error } = await resend.emails.send({
      from: "FFP Advogados <noreply@ffpadvogados.com.br>",
      to: [payload.user.email],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    console.log("Email sent successfully:", {
      email_id: data?.id,
      to: payload.user.email,
      type: payload.email_data.email_action_type,
    });

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
