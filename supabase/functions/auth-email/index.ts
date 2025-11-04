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
  const { token_hash, email_action_type } = data.email_data;
  const { email } = data.user;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const customDomain = "https://srv.ffpadvogados.com.br";
  const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${customDomain}`;
  
  const logoUrl = "https://srv.ffpadvogados.com.br/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png";

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
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap');
                
                body { 
                  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  background-color: #f5f5f5; 
                  margin: 0; 
                  padding: 0; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background-color: #ffffff; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 20px rgba(30, 58, 138, 0.15); 
                }
                .header { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 40px 20px; 
                  text-align: center; 
                }
                .logo { 
                  max-width: 200px; 
                  height: auto; 
                  margin-bottom: 20px; 
                }
                .header h1 { 
                  color: #d4af37; 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 700; 
                  font-family: 'Playfair Display', serif; 
                }
                .content { 
                  padding: 40px 30px; 
                }
                .content p { 
                  color: #374151; 
                  line-height: 1.8; 
                  margin: 0 0 20px 0; 
                  font-size: 15px; 
                }
                .button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #d4af37 0%, #c99a2e 100%); 
                  color: #1e293b !important; 
                  text-decoration: none; 
                  padding: 16px 40px; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  margin: 20px 0; 
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                }
                .button:hover { 
                  background: linear-gradient(135deg, #c99a2e 0%, #b8941f 100%); 
                  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
                  transform: translateY(-2px);
                }
                .footer { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 30px; 
                  text-align: center; 
                  color: #d4af37;
                }
                .footer p { 
                  margin: 5px 0; 
                  font-size: 14px; 
                }
                .footer strong { 
                  font-family: 'Playfair Display', serif; 
                  font-size: 18px; 
                  color: #d4af37;
                }
                .warning { 
                  background-color: #fef3c7; 
                  border-left: 4px solid #d4af37; 
                  padding: 16px 20px; 
                  margin: 25px 0; 
                  border-radius: 6px; 
                }
                .warning p { 
                  color: #92400e; 
                  margin: 0; 
                  font-size: 14px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${logoUrl}" alt="FFP Advogados" class="logo">
                  <h1>Redefinir Senha</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema <strong>FFP Advogados</strong>.</p>
                  <p>Para criar uma nova senha, clique no botão abaixo:</p>
                  <center>
                    <a href="${confirmationUrl}" class="button">Redefinir Minha Senha</a>
                  </center>
                  <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${confirmationUrl}" style="color: #2563eb; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                  <div class="warning">
                    <p><strong>⚠️ Importante:</strong> Este link é válido por 1 hora e só pode ser usado uma vez.</p>
                  </div>
                  <p style="margin-top: 30px;">Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.</p>
                </div>
                <div class="footer">
                  <p><strong>FFP Advogados</strong></p>
                  <p style="color: #ffffff; opacity: 0.9;">Sistema de Gestão de Inadimplência</p>
                  <p style="margin-top: 15px; font-size: 12px; color: #ffffff; opacity: 0.8;">Este é um email automático, por favor não responda.</p>
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
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap');
                
                body { 
                  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  background-color: #f5f5f5; 
                  margin: 0; 
                  padding: 0; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background-color: #ffffff; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 20px rgba(30, 58, 138, 0.15); 
                }
                .header { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 40px 20px; 
                  text-align: center; 
                }
                .logo { 
                  max-width: 200px; 
                  height: auto; 
                  margin-bottom: 20px; 
                }
                .header h1 { 
                  color: #d4af37; 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 700; 
                  font-family: 'Playfair Display', serif; 
                }
                .content { 
                  padding: 40px 30px; 
                }
                .content p { 
                  color: #374151; 
                  line-height: 1.8; 
                  margin: 0 0 20px 0; 
                  font-size: 15px; 
                }
                .button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #d4af37 0%, #c99a2e 100%); 
                  color: #1e293b !important; 
                  text-decoration: none; 
                  padding: 16px 40px; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  margin: 20px 0; 
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                }
                .button:hover { 
                  background: linear-gradient(135deg, #c99a2e 0%, #b8941f 100%); 
                  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
                  transform: translateY(-2px);
                }
                .footer { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 30px; 
                  text-align: center; 
                  color: #d4af37;
                }
                .footer p { 
                  margin: 5px 0; 
                  font-size: 14px; 
                }
                .footer strong { 
                  font-family: 'Playfair Display', serif; 
                  font-size: 18px; 
                  color: #d4af37;
                }
                .info { 
                  background-color: #dbeafe; 
                  border-left: 4px solid #2563eb; 
                  padding: 16px 20px; 
                  margin: 25px 0; 
                  border-radius: 6px; 
                }
                .info p { 
                  color: #1e40af; 
                  margin: 0; 
                  font-size: 14px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${logoUrl}" alt="FFP Advogados" class="logo">
                  <h1>Bem-vindo!</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Seja bem-vindo ao sistema <strong>FFP Advogados</strong>!</p>
                  <p>Para ativar sua conta e começar a usar o sistema, precisamos confirmar seu endereço de email.</p>
                  <center>
                    <a href="${confirmationUrl}" class="button">Confirmar Meu Email</a>
                  </center>
                  <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <a href="${confirmationUrl}" style="color: #2563eb; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                  <div class="info">
                    <p><strong>ℹ️ Dica:</strong> Após confirmar seu email, você poderá acessar o sistema com suas credenciais.</p>
                  </div>
                  <p style="margin-top: 30px;">Se você não criou esta conta, ignore este email.</p>
                </div>
                <div class="footer">
                  <p><strong>FFP Advogados</strong></p>
                  <p style="color: #ffffff; opacity: 0.9;">Sistema de Gestão de Inadimplência</p>
                  <p style="margin-top: 15px; font-size: 12px; color: #ffffff; opacity: 0.8;">Este é um email automático, por favor não responda.</p>
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
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap');
                
                body { 
                  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  background-color: #f5f5f5; 
                  margin: 0; 
                  padding: 0; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background-color: #ffffff; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 20px rgba(30, 58, 138, 0.15); 
                }
                .header { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 40px 20px; 
                  text-align: center; 
                }
                .logo { 
                  max-width: 200px; 
                  height: auto; 
                  margin-bottom: 20px; 
                }
                .header h1 { 
                  color: #d4af37; 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 700; 
                  font-family: 'Playfair Display', serif; 
                }
                .content { 
                  padding: 40px 30px; 
                }
                .content p { 
                  color: #374151; 
                  line-height: 1.8; 
                  margin: 0 0 20px 0; 
                  font-size: 15px; 
                }
                .button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #d4af37 0%, #c99a2e 100%); 
                  color: #1e293b !important; 
                  text-decoration: none; 
                  padding: 16px 40px; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  margin: 20px 0; 
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                }
                .footer { 
                  background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                  padding: 30px; 
                  text-align: center; 
                  color: #d4af37;
                }
                .footer p { 
                  margin: 5px 0; 
                  font-size: 14px; 
                }
                .footer strong { 
                  font-family: 'Playfair Display', serif; 
                  font-size: 18px; 
                  color: #d4af37;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${logoUrl}" alt="FFP Advogados" class="logo">
                  <h1>Alteração de Email</h1>
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
                  <p style="color: #ffffff; opacity: 0.9;">Sistema de Gestão de Inadimplência</p>
                  <p style="margin-top: 15px; font-size: 12px; color: #ffffff; opacity: 0.8;">Este é um email automático, por favor não responda.</p>
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
