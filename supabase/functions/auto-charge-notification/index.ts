import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { chargeId, sendEmail = true, sendWhatsApp = true } = await req.json();

    console.log(`Processing auto notification for charge: ${chargeId}`);

    // Buscar dados da cobrança com unidade e condomínio
    const { data: charge, error: chargeError } = await supabaseClient
      .from("charges")
      .select(`
        *,
        units (
          unit_number,
          block,
          owner_name,
          owner_email,
          owner_phone,
          tenant_name,
          tenant_email,
          tenant_phone,
          is_rented,
          condominiums (
            name,
            address
          )
        )
      `)
      .eq("id", chargeId)
      .single();

    if (chargeError || !charge) {
      console.error("Charge not found:", chargeError);
      return new Response(
        JSON.stringify({ error: "Cobrança não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const unit = charge.units;
    const condo = unit?.condominiums;
    
    // Determinar destinatário (locatário se alugado, senão proprietário)
    const recipientName = unit?.is_rented ? unit.tenant_name : unit?.owner_name;
    const recipientEmail = unit?.is_rented ? unit.tenant_email : unit?.owner_email;
    const recipientPhone = unit?.is_rented ? unit.tenant_phone : unit?.owner_phone;

    const results = {
      email: null as any,
      whatsapp: null as any,
    };

    // Formatar valores
    const formatCurrency = (value: number) => 
      `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    
    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString("pt-BR");

    // Enviar Email
    if (sendEmail && recipientEmail) {
      try {
        console.log(`Sending email to: ${recipientEmail}`);
        
        const emailResponse = await resend.emails.send({
          from: "FFP Advogados <cobranca@ffpadvogados.com.br>",
          to: [recipientEmail],
          subject: `Cobrança Condominial - ${condo?.name || "Condomínio"} - Vencimento: ${formatDate(charge.due_date)}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9fafb; }
                .amount { font-size: 24px; color: #1f2937; font-weight: bold; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
                .label { color: #666; font-size: 12px; }
                .value { font-weight: bold; }
                .button { display: inline-block; padding: 12px 24px; background: #d4a853; color: #1f2937; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>FFP Advogados</h1>
                  <p>Notificação de Cobrança Condominial</p>
                </div>
                <div class="content">
                  <p>Prezado(a) <strong>${recipientName || "Condômino"}</strong>,</p>
                  
                  <p>Informamos que existe uma cobrança pendente referente ao seu imóvel:</p>
                  
                  <div class="info-row">
                    <span class="label">Condomínio</span><br>
                    <span class="value">${condo?.name || "N/A"}</span>
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Unidade</span><br>
                    <span class="value">${unit?.unit_number || "N/A"}${unit?.block ? ` - Bloco ${unit.block}` : ""}</span>
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Referência</span><br>
                    <span class="value">${charge.reference_month || charge.description || "Cobrança Condominial"}</span>
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Vencimento</span><br>
                    <span class="value">${formatDate(charge.due_date)}</span>
                  </div>
                  
                  <div class="info-row">
                    <span class="label">Valor</span><br>
                    <span class="amount">${formatCurrency(charge.amount)}</span>
                  </div>
                  
                  ${charge.pix_code ? `
                  <div class="info-row">
                    <span class="label">Código PIX (Copia e Cola)</span><br>
                    <code style="font-size: 11px; word-break: break-all;">${charge.pix_code}</code>
                  </div>
                  ` : ""}
                  
                  ${charge.boleto_url ? `
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${charge.boleto_url}" class="button">Acessar Boleto</a>
                  </div>
                  ` : ""}
                  
                  <p>Em caso de dúvidas ou para negociação, entre em contato conosco.</p>
                </div>
                <div class="footer">
                  <p>FFP Advogados - Cobrança Condominial</p>
                  <p>Este é um e-mail automático, por favor não responda.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("Email sent:", emailResponse);
        results.email = { success: true, id: emailResponse.data?.id };

        // Registrar mensagem no banco
        await supabaseClient.from("messages").insert({
          type: "email",
          recipient: recipientEmail,
          charge_id: chargeId,
          unit_id: charge.unit_id,
          subject: `Cobrança Condominial - ${condo?.name}`,
          status: "sent",
          sent_at: new Date().toISOString(),
          external_id: emailResponse.data?.id,
        });

      } catch (emailError: any) {
        console.error("Email error:", emailError);
        results.email = { success: false, error: emailError.message };
      }
    }

    // Enviar WhatsApp via UAZAPI
    if (sendWhatsApp && recipientPhone) {
      try {
        const phone = recipientPhone.replace(/\D/g, "");
        const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;
        
        console.log(`Sending WhatsApp to: ${formattedPhone}`);

        // Buscar instância UAZAPI
        const { data: instance } = await supabaseClient
          .from("uazapi_instances")
          .select("*")
          .eq("is_default", true)
          .eq("status", "connected")
          .single();

        if (!instance) {
          console.log("No connected UAZAPI instance found");
          results.whatsapp = { success: false, error: "Instância WhatsApp não configurada" };
        } else {
          const message = `*FFP Advogados - Cobrança Condominial*

Prezado(a) *${recipientName || "Condômino"}*,

Informamos que existe uma cobrança pendente:

📍 *Condomínio:* ${condo?.name || "N/A"}
🏠 *Unidade:* ${unit?.unit_number || "N/A"}${unit?.block ? ` - Bloco ${unit.block}` : ""}
📅 *Vencimento:* ${formatDate(charge.due_date)}
💰 *Valor:* ${formatCurrency(charge.amount)}

${charge.pix_code ? `*PIX Copia e Cola:*\n\`${charge.pix_code}\`` : ""}

Para dúvidas ou negociação, responda esta mensagem.

_Mensagem automática - FFP Advogados_`;

          const uazapiResponse = await fetch(`${instance.base_url}/message/sendText/${instance.instance_id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": instance.api_key,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: message,
            }),
          });

          const uazapiData = await uazapiResponse.json();
          console.log("UAZAPI response:", uazapiData);

          if (uazapiResponse.ok) {
            results.whatsapp = { success: true, id: uazapiData.key?.id };

            // Registrar mensagem
            await supabaseClient.from("messages").insert({
              type: "whatsapp",
              recipient: formattedPhone,
              charge_id: chargeId,
              unit_id: charge.unit_id,
              content: message,
              status: "sent",
              sent_at: new Date().toISOString(),
              external_id: uazapiData.key?.id,
            });
          } else {
            results.whatsapp = { success: false, error: uazapiData.message || "Erro ao enviar" };
          }
        }
      } catch (whatsappError: any) {
        console.error("WhatsApp error:", whatsappError);
        results.whatsapp = { success: false, error: whatsappError.message };
      }
    }

    // Registrar no timeline da cobrança
    await supabaseClient.from("charge_timeline").insert({
      charge_id: chargeId,
      event_type: "notification_sent",
      event_data: {
        email: results.email,
        whatsapp: results.whatsapp,
        sent_at: new Date().toISOString(),
      },
    });

    console.log("Notification complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in auto-charge-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});