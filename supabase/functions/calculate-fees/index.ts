import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculateFeesRequest {
  chargeId?: string;
  amount?: number;
  dueDate?: string;
  referenceDate?: string;
}

interface FeeCalculation {
  originalAmount: number;
  daysLate: number;
  finePercent: number;
  fineAmount: number;
  interestPercent: number;
  interestAmount: number;
  correctionAmount: number;
  attorneyFees: number;
  totalAmount: number;
  breakdown: {
    label: string;
    value: number;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('💰 Calculando juros e multa...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { chargeId, amount, dueDate, referenceDate }: CalculateFeesRequest = await req.json();

    // Buscar parâmetros de negociação
    const { data: params } = await supabase
      .from('negotiation_parameters')
      .select('*');

    const paramMap: Record<string, number> = {};
    params?.forEach((p: any) => {
      paramMap[p.parameter_key] = parseFloat(p.parameter_value) || 0;
    });

    // Valores padrão baseados na legislação brasileira
    const finePercent = paramMap['fine_percent'] || 2; // 2% multa (limite legal)
    const monthlyInterest = paramMap['monthly_interest'] || 1; // 1% ao mês (12% ao ano)
    const correctionIndex = paramMap['correction_index'] || 0.5; // Correção monetária aproximada
    const attorneyFeesPercent = paramMap['attorney_fees'] || 0; // Honorários advocatícios

    let originalAmount: number;
    let dueDateObj: Date;
    const referenceDateObj = referenceDate ? new Date(referenceDate) : new Date();

    // Se temos um chargeId, buscar os dados da cobrança
    if (chargeId) {
      const { data: charge, error } = await supabase
        .from('charges')
        .select('*')
        .eq('id', chargeId)
        .single();

      if (error || !charge) {
        return new Response(
          JSON.stringify({ error: 'Cobrança não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      originalAmount = parseFloat(charge.amount);
      dueDateObj = new Date(charge.due_date);
    } else if (amount && dueDate) {
      originalAmount = amount;
      dueDateObj = new Date(dueDate);
    } else {
      return new Response(
        JSON.stringify({ error: 'Informe chargeId ou amount + dueDate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calcular dias de atraso
    const daysLate = Math.max(0, Math.floor((referenceDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)));

    let fineAmount = 0;
    let interestAmount = 0;
    let correctionAmount = 0;
    let attorneyFees = 0;

    if (daysLate > 0) {
      // Multa (aplicada uma única vez)
      fineAmount = originalAmount * (finePercent / 100);

      // Juros pro-rata (diário)
      const dailyInterest = monthlyInterest / 30;
      interestAmount = originalAmount * (dailyInterest / 100) * daysLate;

      // Correção monetária
      const monthsLate = daysLate / 30;
      correctionAmount = originalAmount * (correctionIndex / 100) * monthsLate;

      // Honorários advocatícios (se aplicável)
      if (attorneyFeesPercent > 0 && daysLate > 90) {
        attorneyFees = originalAmount * (attorneyFeesPercent / 100);
      }
    }

    const totalAmount = originalAmount + fineAmount + interestAmount + correctionAmount + attorneyFees;

    const calculation: FeeCalculation = {
      originalAmount,
      daysLate,
      finePercent,
      fineAmount: Math.round(fineAmount * 100) / 100,
      interestPercent: monthlyInterest,
      interestAmount: Math.round(interestAmount * 100) / 100,
      correctionAmount: Math.round(correctionAmount * 100) / 100,
      attorneyFees: Math.round(attorneyFees * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      breakdown: [
        { label: 'Valor Original', value: originalAmount },
        { label: `Multa (${finePercent}%)`, value: Math.round(fineAmount * 100) / 100 },
        { label: `Juros (${monthlyInterest}% a.m. x ${daysLate} dias)`, value: Math.round(interestAmount * 100) / 100 },
        { label: 'Correção Monetária', value: Math.round(correctionAmount * 100) / 100 },
      ],
    };

    if (attorneyFees > 0) {
      calculation.breakdown.push({
        label: `Honorários (${attorneyFeesPercent}%)`,
        value: Math.round(attorneyFees * 100) / 100,
      });
    }

    calculation.breakdown.push({
      label: 'TOTAL',
      value: Math.round(totalAmount * 100) / 100,
    });

    // Se temos chargeId, atualizar a cobrança com os valores calculados
    if (chargeId) {
      await supabase
        .from('charges')
        .update({
          fine_amount: calculation.fineAmount,
          interest_amount: calculation.interestAmount,
          correction_amount: calculation.correctionAmount,
          attorney_fees: calculation.attorneyFees,
          total_with_fees: calculation.totalAmount,
          fees_rate: monthlyInterest,
          interest_rate: monthlyInterest,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chargeId);

      // Registrar no timeline
      await supabase
        .from('charge_timeline')
        .insert({
          charge_id: chargeId,
          event_type: 'fees_calculated',
          event_data: {
            daysLate,
            originalAmount,
            totalAmount: calculation.totalAmount,
            fineAmount: calculation.fineAmount,
            interestAmount: calculation.interestAmount,
          },
        });
    }

    console.log('✅ Cálculo concluído:', calculation);

    return new Response(
      JSON.stringify(calculation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro ao calcular:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
