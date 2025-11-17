import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔔 Iniciando processamento de notificações automáticas...');

    // Buscar cobranças que precisam de notificação
    const charges = await findChargesNeedingNotification(supabase);
    console.log(`📊 Encontradas ${charges.length} cobranças para processar`);

    let scheduled = 0;
    let skipped = 0;

    for (const charge of charges) {
      try {
        const result = await scheduleNotificationsForCharge(supabase, charge);
        if (result.scheduled > 0) {
          scheduled += result.scheduled;
          console.log(`✅ Agendadas ${result.scheduled} notificações para cobrança ${charge.id}`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar cobrança ${charge.id}:`, error);
      }
    }

    // Processar notificações pendentes agendadas
    const processed = await processPendingNotifications(supabase);
    console.log(`📤 Processadas ${processed} notificações pendentes`);

    return new Response(
      JSON.stringify({
        success: true,
        charges_processed: charges.length,
        notifications_scheduled: scheduled,
        notifications_sent: processed,
        skipped: skipped
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Encontra cobranças que precisam de notificação
 */
async function findChargesNeedingNotification(supabase: any) {
  // Buscar cobranças pendentes ou vencidas
  const { data: charges, error } = await supabase
    .from('charges')
    .select(`
      id,
      owner_id,
      condominium_id,
      administrator_id,
      amount,
      due_date,
      status,
      owners (
        id,
        name,
        email,
        phone,
        cpf
      ),
      condominiums (
        id,
        name,
        unit_number,
        administrator_id
      )
    `)
    .in('status', ['pending', 'overdue'])
    .not('owners.email', 'is', null); // Pelo menos um meio de contato

  if (error) {
    console.error('Erro ao buscar cobranças:', error);
    return [];
  }

  return charges || [];
}

/**
 * Agenda notificações para uma cobrança baseado na estratégia
 */
async function scheduleNotificationsForCharge(supabase: any, charge: any) {
  // Determinar estratégia aplicável
  const strategy = await findApplicableStrategy(supabase, charge);

  if (!strategy) {
    console.log(`⚠️ Nenhuma estratégia encontrada para cobrança ${charge.id}`);
    return { scheduled: 0 };
  }

  // Buscar regras de escalonamento ativas
  const { data: rules } = await supabase
    .from('notification_escalation_rules')
    .select('*')
    .eq('strategy_id', strategy.id)
    .eq('active', true)
    .order('sequence_order');

  if (!rules || rules.length === 0) {
    return { scheduled: 0 };
  }

  const daysOverdue = calculateDaysOverdue(charge.due_date);
  let scheduledCount = 0;

  for (const rule of rules) {
    // Verificar se já está na hora de enviar esta notificação
    if (daysOverdue < rule.trigger_days_after_due) {
      // Ainda não chegou no dia de enviar
      const scheduledDate = addDays(new Date(charge.due_date), rule.trigger_days_after_due);
      const scheduledDateTime = setTime(scheduledDate, rule.send_time);

      // Verificar se já existe notificação agendada
      const { data: existing } = await supabase
        .from('notification_history')
        .select('id')
        .eq('charge_id', charge.id)
        .eq('rule_id', rule.id)
        .single();

      if (!existing) {
        // Agendar notificação
        await scheduleNotification(supabase, charge, rule, scheduledDateTime);
        scheduledCount++;
      }
    } else if (daysOverdue >= rule.trigger_days_after_due) {
      // Já passou do dia, verificar se já foi enviada
      const { data: existing } = await supabase
        .from('notification_history')
        .select('id, status, attempt_number')
        .eq('charge_id', charge.id)
        .eq('rule_id', rule.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!existing) {
        // Enviar imediatamente
        await scheduleNotification(supabase, charge, rule, new Date());
        scheduledCount++;
      } else if (
        existing.status === 'failed' &&
        existing.attempt_number < rule.max_attempts
      ) {
        // Reagendar tentativa
        const retryTime = new Date(Date.now() + rule.retry_interval_hours * 60 * 60 * 1000);
        await scheduleNotification(
          supabase,
          charge,
          rule,
          retryTime,
          existing.attempt_number + 1
        );
        scheduledCount++;
      }
    }
  }

  return { scheduled: scheduledCount };
}

/**
 * Encontra estratégia aplicável (prioridade: condomínio > administradora > padrão)
 */
async function findApplicableStrategy(supabase: any, charge: any) {
  // 1. Estratégia específica do condomínio
  let { data: strategy } = await supabase
    .from('notification_strategies')
    .select('*')
    .eq('condominium_id', charge.condominium_id)
    .eq('active', true)
    .single();

  if (strategy) return strategy;

  // 2. Estratégia da administradora
  ({ data: strategy } = await supabase
    .from('notification_strategies')
    .select('*')
    .eq('administrator_id', charge.administrator_id)
    .eq('active', true)
    .single());

  if (strategy) return strategy;

  // 3. Estratégia padrão
  ({ data: strategy } = await supabase
    .from('notification_strategies')
    .select('*')
    .eq('is_default', true)
    .eq('active', true)
    .single());

  return strategy;
}

/**
 * Agenda uma notificação
 */
async function scheduleNotification(
  supabase: any,
  charge: any,
  rule: any,
  scheduledAt: Date,
  attemptNumber = 1
) {
  // Verificar blacklist
  const { data: blacklisted } = await supabase
    .from('notification_blacklist')
    .select('id')
    .eq('owner_id', charge.owner_id)
    .or(`channel.eq.${rule.channel},channel.eq.all`)
    .single();

  if (blacklisted) {
    console.log(`⛔ Proprietário ${charge.owner_id} está na blacklist`);
    return null;
  }

  // Determinar destinatário baseado no canal
  let recipient = '';
  if (rule.channel === 'email' || rule.channel === 'all') {
    recipient = charge.owners.email;
  } else if (rule.channel === 'whatsapp' || rule.channel === 'sms') {
    recipient = charge.owners.phone;
  }

  // Buscar template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', rule.template_id)
    .single();

  // Gerar mensagem com variáveis substituídas
  const message = template
    ? replaceVariables(template.body, charge)
    : rule.custom_message;

  const { data, error } = await supabase
    .from('notification_history')
    .insert({
      charge_id: charge.id,
      rule_id: rule.id,
      channel: rule.channel,
      recipient: recipient,
      message_sent: message,
      status: 'pending',
      attempt_number: attemptNumber,
      scheduled_at: scheduledAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao agendar notificação:', error);
    return null;
  }

  return data;
}

/**
 * Processa notificações pendentes que chegaram na hora de enviar
 */
async function processPendingNotifications(supabase: any) {
  const { data: notifications } = await supabase
    .from('pending_notifications')
    .select('*')
    .limit(100); // Processar em lotes

  if (!notifications || notifications.length === 0) {
    return 0;
  }

  let processed = 0;

  for (const notification of notifications) {
    try {
      await sendNotification(supabase, notification);
      processed++;
    } catch (error) {
      console.error(`Erro ao enviar notificação ${notification.id}:`, error);

      // Marcar como falha
      await supabase
        .from('notification_history')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);
    }
  }

  return processed;
}

/**
 * Envia uma notificação
 */
async function sendNotification(supabase: any, notification: any) {
  console.log(`📤 Enviando notificação ${notification.id} via ${notification.channel}`);

  let result;

  switch (notification.channel) {
    case 'email':
      result = await sendEmail(supabase, notification);
      break;

    case 'whatsapp':
      result = await sendWhatsApp(supabase, notification);
      break;

    case 'sms':
      result = await sendSMS(supabase, notification);
      break;

    case 'all':
      // Enviar por todos os canais disponíveis
      if (notification.email) {
        await sendEmail(supabase, notification);
      }
      if (notification.phone) {
        await sendWhatsApp(supabase, notification);
      }
      result = { success: true };
      break;

    default:
      throw new Error(`Canal desconhecido: ${notification.channel}`);
  }

  // Atualizar status
  await supabase
    .from('notification_history')
    .update({
      status: result.success ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      external_message_id: result.messageId || null,
      error_message: result.error || null,
      metadata: result.metadata || {}
    })
    .eq('id', notification.id);

  return result;
}

/**
 * Envia email via Resend
 */
async function sendEmail(supabase: any, notification: any) {
  // Invocar Edge Function send-charge-notification
  const { data, error } = await supabase.functions.invoke('send-charge-notification', {
    body: {
      chargeId: notification.charge_id,
      channel: 'email',
      templateMessage: notification.template_body,
      subject: notification.template_subject
    }
  });

  if (error) throw error;
  return { success: true, messageId: data?.messageId };
}

/**
 * Envia WhatsApp via UAZAPI
 */
async function sendWhatsApp(supabase: any, notification: any) {
  const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: {
      phone: notification.phone,
      message: notification.template_body
    }
  });

  if (error) throw error;
  return { success: true, messageId: data?.messageId };
}

/**
 * Envia SMS (implementar integração)
 */
async function sendSMS(supabase: any, notification: any) {
  // TODO: Implementar integração com provedor de SMS (Twilio, etc)
  console.log('⚠️ SMS não implementado ainda');
  return { success: false, error: 'SMS not implemented' };
}

/**
 * Substitui variáveis no template
 */
function replaceVariables(text: string, charge: any): string {
  const variables = {
    nome: charge.owners?.name || 'Proprietário',
    condominio: charge.condominiums?.name || '',
    unidade: charge.condominiums?.unit_number || '',
    valor: formatCurrency(charge.amount),
    valor_original: formatCurrency(charge.amount),
    valor_atualizado: formatCurrency(calculateUpdatedAmount(charge)),
    juros_multa: formatCurrency(calculateFees(charge)),
    vencimento: formatDate(charge.due_date),
    competencia: formatCompetence(charge.due_date),
    dias_atraso: Math.max(0, calculateDaysOverdue(charge.due_date)).toString(),
    link_pagamento: `${Deno.env.get('PUBLIC_URL') || ''}/pagamento/${charge.id}`,
    link_negociacao: `${Deno.env.get('PUBLIC_URL') || ''}/negociacao/${charge.id}`,
    administradora: 'FFP Portal',
    telefone_administradora: '(11) 0000-0000'
  };

  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

// Funções auxiliares
function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatCompetence(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function calculateUpdatedAmount(charge: any): number {
  // TODO: Implementar cálculo real de juros e multa
  const daysOverdue = Math.max(0, calculateDaysOverdue(charge.due_date));
  const interest = charge.amount * 0.01 * daysOverdue; // 1% ao dia
  const fine = charge.amount * 0.02; // 2% de multa
  return charge.amount + interest + fine;
}

function calculateFees(charge: any): number {
  return calculateUpdatedAmount(charge) - charge.amount;
}
