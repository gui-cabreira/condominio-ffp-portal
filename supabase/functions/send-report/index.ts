import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = "https://iugxnhdxbpzauqwkjtao.supabase.co";
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const resend = new Resend(resendApiKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { condominiumId, reportType, emailTo } = await req.json();
    
    if (!condominiumId || !reportType || !emailTo) {
      throw new Error('Parâmetros obrigatórios: condominiumId, reportType, emailTo');
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey!);

    // Get condominium data
    const { data: condominium, error: condoError } = await supabase
      .from('condominiums')
      .select('*')
      .eq('id', condominiumId)
      .single();

    if (condoError || !condominium) {
      throw new Error('Condomínio não encontrado');
    }

    // Get units data
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('condominium_id', condominiumId);

    if (unitsError) {
      throw new Error('Erro ao buscar unidades');
    }

    // Get charges data
    const { data: charges, error: chargesError } = await supabase
      .from('charges')
      .select(`
        *,
        unit:units(unit_number, owner_name)
      `)
      .in('unit_id', units?.map(u => u.id) || []);

    if (chargesError) {
      throw new Error('Erro ao buscar cobranças');
    }

    // Get messages data
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        unit:units(unit_number, owner_name)
      `)
      .in('unit_id', units?.map(u => u.id) || []);

    if (messagesError) {
      throw new Error('Erro ao buscar mensagens');
    }

    // Generate report data
    const totalUnits = units?.length || 0;
    const totalCharges = charges?.length || 0;
    const paidCharges = charges?.filter(c => c.status === 'paid').length || 0;
    const pendingCharges = charges?.filter(c => c.status === 'pending').length || 0;
    const overdueCharges = charges?.filter(c => c.status === 'overdue').length || 0;
    
    const totalAmount = charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const paidAmount = charges?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const pendingAmount = charges?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const overdueAmount = charges?.filter(c => c.status === 'overdue').reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    const totalMessages = messages?.length || 0;
    const openedMessages = messages?.filter(m => m.opened_at).length || 0;
    const respondedMessages = messages?.filter(m => m.responded_at).length || 0;

    const currentDate = new Date().toLocaleDateString('pt-BR');
    const reportPeriod = reportType === 'weekly' ? 'Semanal' : 'Mensal';

    // Generate HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório ${reportPeriod} - ${condominium.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; min-width: 120px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
          .stat-label { font-size: 12px; color: #666; }
          .section { margin: 20px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório ${reportPeriod}</h1>
          <h2>${condominium.name}</h2>
          <p>Período: ${currentDate}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h3>Resumo Executivo</h3>
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${totalUnits}</div>
                <div class="stat-label">Total de Unidades</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${paidCharges}</div>
                <div class="stat-label">Cobranças Pagas</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${pendingCharges}</div>
                <div class="stat-label">Pendentes</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${overdueCharges}</div>
                <div class="stat-label">Vencidas</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Situação Financeira</h3>
            <table class="table">
              <tr>
                <th>Status</th>
                <th>Quantidade</th>
                <th>Valor Total</th>
              </tr>
              <tr>
                <td>Pagas</td>
                <td>${paidCharges}</td>
                <td>R$ ${paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Pendentes</td>
                <td>${pendingCharges}</td>
                <td>R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Vencidas</td>
                <td>${overdueCharges}</td>
                <td>R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="font-weight: bold; background-color: #f8f9fa;">
                <td>Total</td>
                <td>${totalCharges}</td>
                <td>R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3>Comunicação</h3>
            <p>Mensagens enviadas: <strong>${totalMessages}</strong></p>
            <p>Mensagens abertas: <strong>${openedMessages}</strong> (${totalMessages > 0 ? Math.round((openedMessages / totalMessages) * 100) : 0}%)</p>
            <p>Mensagens respondidas: <strong>${respondedMessages}</strong> (${totalMessages > 0 ? Math.round((respondedMessages / totalMessages) * 100) : 0}%)</p>
          </div>

          <div class="section">
            <h3>Análise</h3>
            <p><strong>Taxa de Sucesso:</strong> ${totalCharges > 0 ? Math.round((paidCharges / totalCharges) * 100) : 0}%</p>
            <p><strong>Taxa de Inadimplência:</strong> ${totalCharges > 0 ? Math.round(((pendingCharges + overdueCharges) / totalCharges) * 100) : 0}%</p>
            <p><strong>Eficiência de Comunicação:</strong> ${totalMessages > 0 ? Math.round((openedMessages / totalMessages) * 100) : 0}%</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Relatório gerado automaticamente pelo sistema FFP Advogados</p>
          <p>Data: ${currentDate}</p>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "FFP Advogados <noreply@ffpadvogados.com>",
      to: [emailTo],
      subject: `Relatório ${reportPeriod} - ${condominium.name} - ${currentDate}`,
      html: htmlContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Relatório enviado com sucesso',
      emailId: emailResponse.id,
      reportData: {
        condominium: condominium.name,
        totalUnits,
        paidCharges,
        pendingCharges,
        overdueCharges,
        totalAmount: totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        paidAmount: paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        pendingAmount: pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        overdueAmount: overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-report function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});