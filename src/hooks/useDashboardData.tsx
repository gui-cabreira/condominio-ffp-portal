import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Total em cobrança (valores pendentes)
      const { data: pendingCharges } = await supabase
        .from('charges')
        .select('amount')
        .in('status', ['pending', 'overdue']);

      const totalPending = pendingCharges?.reduce((sum, charge) => sum + Number(charge.amount), 0) || 0;

      // Total de condomínios
      const { count: condominiumsCount } = await supabase
        .from('condominiums')
        .select('*', { count: 'exact', head: true });

      // Total de unidades
      const { count: unitsCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true });

      // Taxas de sucesso
      const { data: allCharges } = await supabase
        .from('charges')
        .select('status');

      const totalCharges = allCharges?.length || 1;
      const paidCharges = allCharges?.filter(c => c.status === 'paid').length || 0;
      const successRate = Math.round((paidCharges / totalCharges) * 100);

      // Estatísticas de automação
      const { data: imports } = await supabase
        .from('charge_imports')
        .select('status, successful_imports, total_charges')
        .order('created_at', { ascending: false })
        .limit(10);

      const totalImported = imports?.reduce((sum, imp) => sum + (imp.total_charges || 0), 0) || 1;
      const successfulImported = imports?.reduce((sum, imp) => sum + (imp.successful_imports || 0), 0) || 0;
      const automationRate = Math.round((successfulImported / totalImported) * 100);

      // Tempo médio de resolução (em dias)
      const { data: paidChargesWithDates } = await supabase
        .from('charges')
        .select('due_date, payment_date')
        .eq('status', 'paid')
        .not('payment_date', 'is', null);

      let avgResolutionDays = 7.2;
      if (paidChargesWithDates && paidChargesWithDates.length > 0) {
        const totalDays = paidChargesWithDates.reduce((sum, charge) => {
          const due = new Date(charge.due_date);
          const paid = new Date(charge.payment_date!);
          const diffDays = Math.ceil((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.abs(diffDays);
        }, 0);
        avgResolutionDays = Number((totalDays / paidChargesWithDates.length).toFixed(1));
      }

      return {
        totalPending,
        condominiumsCount: condominiumsCount || 0,
        unitsCount: unitsCount || 0,
        successRate,
        automationRate,
        avgResolutionDays
      };
    }
  });
}

export function useCondominiums() {
  return useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Para cada condomínio, buscar estatísticas
      const condosWithStats = await Promise.all(
        (data || []).map(async (condo) => {
          const { data: units } = await supabase
            .from('units')
            .select('id')
            .eq('condominium_id', condo.id);

          const unitIds = units?.map(u => u.id) || [];

          const { data: charges } = await supabase
            .from('charges')
            .select('amount, status')
            .in('unit_id', unitIds);

          const totalCharges = charges?.length || 0;
          const paidCharges = charges?.filter(c => c.status === 'paid').length || 0;
          const pendingAmount = charges
            ?.filter(c => c.status !== 'paid')
            .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

          const efficiency = totalCharges > 0 ? Math.round((paidCharges / totalCharges) * 100) : 0;

          return {
            id: condo.id,
            name: condo.name,
            totalUnits: condo.total_units,
            paidUnits: paidCharges,
            pendingAmount: `R$ ${pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            efficiency
          };
        })
      );

      return condosWithStats;
    }
  });
}

export function useMonthlyData() {
  return useQuery({
    queryKey: ['monthly-data'],
    queryFn: async () => {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const monthlyData = [];

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - (5 - i));
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        const { data: charges } = await supabase
          .from('charges')
          .select('amount, status, payment_date')
          .gte('due_date', monthStart.toISOString())
          .lte('due_date', monthEnd.toISOString());

        const collected = charges
          ?.filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        const expected = charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        monthlyData.push({
          month: months[i],
          collected: Math.round(collected),
          expected: Math.round(expected)
        });
      }

      return monthlyData;
    }
  });
}

export function useStatusData() {
  return useQuery({
    queryKey: ['status-data'],
    queryFn: async () => {
      const { data: charges } = await supabase
        .from('charges')
        .select('status');

      const total = charges?.length || 1;
      const paid = charges?.filter(c => c.status === 'paid').length || 0;
      const pending = charges?.filter(c => c.status === 'pending').length || 0;
      const overdue = charges?.filter(c => c.status === 'overdue').length || 0;

      return [
        { name: 'Pago', value: Math.round((paid / total) * 100), color: '#22c55e' },
        { name: 'Pendente', value: Math.round((pending / total) * 100), color: '#f59e0b' },
        { name: 'Vencido', value: Math.round((overdue / total) * 100), color: '#ef4444' },
      ];
    }
  });
}

export function useCommunicationData() {
  return useQuery({
    queryKey: ['communication-data'],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select('type, status, opened_at, responded_at');

      const whatsappMessages = messages?.filter(m => m.type === 'whatsapp') || [];
      const emailMessages = messages?.filter(m => m.type === 'email') || [];
      const smsMessages = messages?.filter(m => m.type === 'sms') || [];

      return [
        {
          method: 'WhatsApp',
          sent: whatsappMessages.length,
          opened: whatsappMessages.filter(m => m.opened_at).length,
          responded: whatsappMessages.filter(m => m.responded_at).length
        },
        {
          method: 'E-mail',
          sent: emailMessages.length,
          opened: emailMessages.filter(m => m.opened_at).length,
          responded: emailMessages.filter(m => m.responded_at).length
        },
        {
          method: 'SMS',
          sent: smsMessages.length,
          opened: smsMessages.filter(m => m.opened_at).length,
          responded: smsMessages.filter(m => m.responded_at).length
        }
      ];
    }
  });
}

export function useWeeklyPerformance() {
  return useQuery({
    queryKey: ['weekly-performance'],
    queryFn: async () => {
      const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const weeklyData = [];

      for (let i = 0; i < 4; i++) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);

        // Mensagens enviadas na semana
        const { data: messages } = await supabase
          .from('messages')
          .select('responded_at')
          .gte('sent_at', weekStart.toISOString())
          .lte('sent_at', weekEnd.toISOString());

        // Cobranças pagas na semana
        const { data: charges } = await supabase
          .from('charges')
          .select('status, payment_date')
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString());

        weeklyData.unshift({
          week: weeks[3 - i],
          enviados: messages?.length || 0,
          respondidos: messages?.filter(m => m.responded_at).length || 0,
          pagos: charges?.filter(c => c.status === 'paid').length || 0
        });
      }

      return weeklyData;
    }
  });
}

export function useConversionFunnel() {
  return useQuery({
    queryKey: ['conversion-funnel'],
    queryFn: async () => {
      // Buscar todas as mensagens
      const { data: messages } = await supabase
        .from('messages')
        .select('id, status, sent_at, delivered_at, opened_at, clicked_at, responded_at, charge_id');

      // Buscar todas as cobranças pagas
      const { data: paidCharges } = await supabase
        .from('charges')
        .select('id')
        .eq('status', 'paid');

      const paidChargeIds = new Set(paidCharges?.map(c => c.id) || []);

      // Calcular métricas do funil
      const totalEnviado = messages?.filter(m => m.sent_at)?.length || 0;
      const totalAberto = messages?.filter(m => m.opened_at)?.length || 0;
      const totalClicado = messages?.filter(m => m.clicked_at)?.length || 0;
      
      // Mensagens que tiveram resposta ou interação
      const totalVisualizado = messages?.filter(m => m.responded_at || m.clicked_at || m.opened_at)?.length || 0;
      
      // Mensagens de cobranças que foram pagas
      const totalPago = messages?.filter(m => m.charge_id && paidChargeIds.has(m.charge_id))?.length || 0;

      // Base para porcentagem (total enviado ou 1 para evitar divisão por zero)
      const base = totalEnviado || 1;

      return [
        { 
          stage: 'Enviado', 
          count: totalEnviado, 
          percentage: 100 
        },
        { 
          stage: 'Aberto', 
          count: totalAberto, 
          percentage: Math.round((totalAberto / base) * 100) 
        },
        { 
          stage: 'Clicado', 
          count: totalClicado, 
          percentage: Math.round((totalClicado / base) * 100) 
        },
        { 
          stage: 'Visualizado', 
          count: totalVisualizado, 
          percentage: Math.round((totalVisualizado / base) * 100) 
        },
        { 
          stage: 'Pago', 
          count: totalPago, 
          percentage: Math.round((totalPago / base) * 100) 
        },
      ];
    }
  });
}
