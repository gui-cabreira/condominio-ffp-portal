import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  chargeId: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'all';
  templateMessage?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Disparando notificação de cobrança...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { chargeId, channel, templateMessage }: NotificationRequest = await req.json();

    if (!chargeId) {
      throw new Error('chargeId é obrigatório');
    }

    // Buscar cobrança com dados completos
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select(`
        *,
        units (
          *,
          condominiums (
            *
          )
        )
      `)
      .eq('id', chargeId)
      .single();

    if (chargeError || !charge) {
      throw new Error('Cobrança não encontrada');
    }

    console.log(`💰 Cobrança: ${charge.amount} - Unidade ${charge.units?.unit_number}`);

    const unit = charge.units;
    const condominium = unit?.condominiums;

    // Dados para substituição no template
    const chargeData = {
      owner_name: unit?.owner_name || 'Proprietário',
      unit_number: unit?.unit_number || '',
      condominium_name: condominium?.name || '',
      amount: charge.amount,
      due_date: charge.due_date,
      reference_month: charge.reference_month,
      total_with_fees: charge.total_with_fees || charge.amount,
      days_overdue: calculateDaysOverdue(charge.due_date),
    };

    // Template de mensagem padrão se não fornecido
    const defaultTemplate = `
Olá {nome}! 👋

Você possui uma cobrança pendente:

🏢 Condomínio: {condominio}
🏠 Unidade: {unidade}
💰 Valor: {valor}
📅 Vencimento: {vencimento}
⏰ Dias de atraso: {dias_atraso}

Para regularizar sua situação, entre em contato conosco ou realize o pagamento através do link: {link_pagamento}

Equipe FFP Advogados
    `.trim();

    const message = templateMessage || defaultTemplate;

    const results: any = {
      email: null,
      whatsapp: null,
      sms: null,
    };

    // Disparar por Email
    if (channel === 'email' || channel === 'all') {
      if (unit?.owner_email) {
        try {
          console.log('📧 Enviando email...');

          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-workflow-email', {
            body: {
              to: unit.owner_email,
              subject: `Cobrança Pendente - ${condominium?.name}`,
              message: message,
              chargeData,
            },
          });

          if (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
            results.email = { success: false, error: emailError.message };
          } else {
            console.log('✅ Email enviado');
            results.email = { success: true, data: emailResult };

            // Registrar no timeline
            await supabase
              .from('charge_timeline')
              .insert({
                charge_id: chargeId,
                event_type: 'sent',
                description: 'Email de cobrança enviado',
                metadata: { channel: 'email', to: unit.owner_email },
              });
          }
        } catch (error) {
          console.error('❌ Exceção no envio de email:', error);
          results.email = { success: false, error: error.message };
        }
      } else {
        results.email = { success: false, error: 'Email não cadastrado' };
      }
    }

    // Disparar por WhatsApp
    if (channel === 'whatsapp' || channel === 'all') {
      if (unit?.owner_phone) {
        try {
          console.log('📱 Enviando WhatsApp...');

          // Formatar mensagem (substituir variáveis)
          const whatsappMessage = replaceVariables(message, chargeData);

          const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              phone: unit.owner_phone,
              message: whatsappMessage,
              chargeId: chargeId,
            },
          });

          if (whatsappError) {
            console.error('❌ Erro ao enviar WhatsApp:', whatsappError);
            results.whatsapp = { success: false, error: whatsappError.message };
          } else {
            console.log('✅ WhatsApp enviado');
            results.whatsapp = { success: true, data: whatsappResult };

            // Registrar no timeline
            await supabase
              .from('charge_timeline')
              .insert({
                charge_id: chargeId,
                event_type: 'sent',
                description: 'WhatsApp de cobrança enviado',
                metadata: { channel: 'whatsapp', to: unit.owner_phone },
              });
          }
        } catch (error) {
          console.error('❌ Exceção no envio de WhatsApp:', error);
          results.whatsapp = { success: false, error: error.message };
        }
      } else {
        results.whatsapp = { success: false, error: 'Telefone não cadastrado' };
      }
    }

    // Disparar por SMS (futuro)
    if (channel === 'sms' || channel === 'all') {
      results.sms = { success: false, error: 'SMS não implementado ainda' };
    }

    // Contar sucessos
    const successCount = Object.values(results).filter((r: any) => r?.success).length;
    const totalAttempts = Object.values(results).filter((r: any) => r !== null).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        chargeId,
        channel,
        results,
        summary: {
          sent: successCount,
          failed: totalAttempts - successCount,
          total: totalAttempts,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro ao disparar notificação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Função helper para substituir variáveis
function replaceVariables(text: string, data: any): string {
  if (!text || !data) return text;

  let result = text;

  result = result.replace(/\{nome\}/g, data.owner_name || 'Proprietário');
  result = result.replace(/\{valor\}/g, formatCurrency(data.amount || 0));
  result = result.replace(/\{vencimento\}/g, formatDate(data.due_date));
  result = result.replace(/\{unidade\}/g, data.unit_number || '');
  result = result.replace(/\{condominio\}/g, data.condominium_name || '');
  result = result.replace(/\{dias_atraso\}/g, data.days_overdue?.toString() || '0');
  result = result.replace(/\{link_pagamento\}/g, '#'); // TODO: Gerar link real

  return result;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calculateDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today.getTime() - due.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}
