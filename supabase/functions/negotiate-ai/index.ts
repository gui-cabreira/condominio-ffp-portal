import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NegotiationRequest {
  chargeId: string;
  proposedAmount?: number;
  proposedDiscount?: number;
  installments?: number;
  debtorMessage?: string;
  action: 'analyze' | 'suggest' | 'qualify';
}

interface ChargeData {
  id: string;
  amount: number;
  due_date: string;
  total_with_fees: number;
  description: string;
  reference_month: string;
  unit: {
    unit_number: string;
    owner_name: string;
    condominium: {
      name: string;
    };
  };
}

interface NegotiationParameters {
  max_discount_percentage: number;
  min_down_payment_percentage: number;
  max_installments: number;
  interest_rate_monthly: number;
  auto_approve_threshold: number;
  ai_confidence_threshold: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { chargeId, proposedAmount, proposedDiscount, installments, debtorMessage, action }: NegotiationRequest = await req.json();
    
    console.log(`[negotiate-ai] Processing ${action} for charge ${chargeId}`);

    // Fetch charge data with relationships
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select(`
        id, amount, due_date, total_with_fees, description, reference_month,
        unit:units (
          unit_number, owner_name,
          condominium:condominiums (name)
        )
      `)
      .eq('id', chargeId)
      .single();

    if (chargeError || !charge) {
      console.error('[negotiate-ai] Charge not found:', chargeError);
      throw new Error('Cobrança não encontrada');
    }

    // Fetch negotiation parameters
    const { data: paramsData } = await supabase
      .from('negotiation_parameters')
      .select('parameter_key, parameter_value');

    const params: NegotiationParameters = {
      max_discount_percentage: 30,
      min_down_payment_percentage: 20,
      max_installments: 12,
      interest_rate_monthly: 1,
      auto_approve_threshold: 15,
      ai_confidence_threshold: 0.7,
    };

    if (paramsData) {
      paramsData.forEach((p: { parameter_key: string; parameter_value: string }) => {
        const key = p.parameter_key as keyof NegotiationParameters;
        if (key in params) {
          params[key] = parseFloat(p.parameter_value);
        }
      });
    }

    // Calculate days overdue
    const dueDate = new Date(charge.due_date);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const totalDebt = charge.total_with_fees || charge.amount;
    
    // Build context for AI
    const context = {
      charge: {
        originalAmount: charge.amount,
        totalWithFees: totalDebt,
        dueDate: charge.due_date,
        daysOverdue,
        description: charge.description,
        referenceMonth: charge.reference_month,
      },
      unit: {
        number: charge.unit?.unit_number,
        ownerName: charge.unit?.owner_name,
        condominiumName: charge.unit?.condominium?.name,
      },
      parameters: params,
      proposal: {
        amount: proposedAmount,
        discount: proposedDiscount,
        installments,
        message: debtorMessage,
      },
    };

    let aiPrompt = '';
    
    if (action === 'suggest') {
      aiPrompt = `Você é um especialista em negociação de dívidas condominiais. Analise a situação e sugira uma proposta de acordo.

DADOS DA DÍVIDA:
- Valor original: R$ ${charge.amount.toFixed(2)}
- Valor atualizado (com multa/juros): R$ ${totalDebt.toFixed(2)}
- Vencimento: ${charge.due_date}
- Dias em atraso: ${daysOverdue}
- Condomínio: ${charge.unit?.condominium?.name || 'N/A'}
- Unidade: ${charge.unit?.unit_number || 'N/A'}
- Proprietário: ${charge.unit?.owner_name || 'N/A'}

PARÂMETROS DE NEGOCIAÇÃO:
- Desconto máximo permitido: ${params.max_discount_percentage}%
- Parcelas máximas: ${params.max_installments}
- Taxa de juros mensal: ${params.interest_rate_monthly}%
- Entrada mínima: ${params.min_down_payment_percentage}%

Forneça uma resposta em JSON com o seguinte formato:
{
  "suggestedDiscount": <número de 0 a ${params.max_discount_percentage}>,
  "suggestedAmount": <valor sugerido>,
  "suggestedInstallments": <número de parcelas sugerido>,
  "downPayment": <valor da entrada se houver parcelamento>,
  "installmentValue": <valor de cada parcela>,
  "reasoning": "<explicação da sugestão>",
  "negotiationTips": ["<dica 1>", "<dica 2>"],
  "riskLevel": "<baixo|médio|alto>",
  "confidence": <0.0 a 1.0>
}`;
    } else if (action === 'qualify' || action === 'analyze') {
      const discountPercent = proposedDiscount || ((totalDebt - (proposedAmount || totalDebt)) / totalDebt * 100);
      
      aiPrompt = `Você é um especialista em análise de propostas de negociação de dívidas condominiais. Qualifique a proposta recebida.

DADOS DA DÍVIDA:
- Valor original: R$ ${charge.amount.toFixed(2)}
- Valor atualizado: R$ ${totalDebt.toFixed(2)}
- Dias em atraso: ${daysOverdue}
- Condomínio: ${charge.unit?.condominium?.name || 'N/A'}
- Unidade: ${charge.unit?.unit_number || 'N/A'}

PROPOSTA DO DEVEDOR:
- Valor proposto: R$ ${proposedAmount?.toFixed(2) || 'Não informado'}
- Desconto solicitado: ${discountPercent.toFixed(1)}%
- Parcelas solicitadas: ${installments || 1}
- Mensagem do devedor: "${debtorMessage || 'Nenhuma mensagem'}"

PARÂMETROS PERMITIDOS:
- Desconto máximo: ${params.max_discount_percentage}%
- Parcelas máximas: ${params.max_installments}
- Auto-aprovação até: ${params.auto_approve_threshold}%

Forneça uma resposta em JSON:
{
  "recommendation": "<aprovar|rejeitar|contraproposta>",
  "score": <0.0 a 1.0 indicando qualidade da proposta>,
  "withinPolicy": <true|false>,
  "autoApprovable": <true|false>,
  "analysis": "<análise detalhada>",
  "counterProposal": {
    "amount": <valor se contraproposta>,
    "discount": <desconto se contraproposta>,
    "installments": <parcelas se contraproposta>
  },
  "reasoning": "<justificativa da recomendação>",
  "riskFactors": ["<fator 1>", "<fator 2>"],
  "confidence": <0.0 a 1.0>
}`;
    }

    // Call Lovable AI
    let aiResponse;
    
    if (lovableApiKey) {
      console.log('[negotiate-ai] Calling Lovable AI...');
      
      const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            {
              role: "system",
              content: "Você é um especialista em cobrança e negociação de dívidas condominiais no Brasil. Sempre responda em JSON válido."
            },
            {
              role: "user",
              content: aiPrompt
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[negotiate-ai] AI API error:', errorText);
        throw new Error('Erro ao chamar IA');
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não está em formato JSON válido');
      }
    } else {
      // Fallback without AI - basic rule-based analysis
      console.log('[negotiate-ai] No Lovable API key, using rule-based analysis');
      
      const discountPercent = proposedDiscount || ((totalDebt - (proposedAmount || totalDebt)) / totalDebt * 100);
      const withinPolicy = discountPercent <= params.max_discount_percentage && (installments || 1) <= params.max_installments;
      const autoApprovable = discountPercent <= params.auto_approve_threshold;
      
      if (action === 'suggest') {
        // Suggest based on days overdue
        let suggestedDiscount = Math.min(daysOverdue * 0.5, params.max_discount_percentage);
        if (daysOverdue > 180) suggestedDiscount = params.max_discount_percentage;
        else if (daysOverdue > 90) suggestedDiscount = Math.min(20, params.max_discount_percentage);
        else if (daysOverdue > 30) suggestedDiscount = Math.min(10, params.max_discount_percentage);
        else suggestedDiscount = 5;
        
        const suggestedAmount = totalDebt * (1 - suggestedDiscount / 100);
        const suggestedInstallments = daysOverdue > 90 ? Math.min(6, params.max_installments) : 1;
        
        aiResponse = {
          suggestedDiscount,
          suggestedAmount,
          suggestedInstallments,
          downPayment: suggestedInstallments > 1 ? suggestedAmount * (params.min_down_payment_percentage / 100) : suggestedAmount,
          installmentValue: suggestedInstallments > 1 ? (suggestedAmount * (1 - params.min_down_payment_percentage / 100)) / suggestedInstallments : 0,
          reasoning: `Baseado em ${daysOverdue} dias de atraso, sugerimos ${suggestedDiscount}% de desconto.`,
          negotiationTips: [
            "Enfatize o benefício de regularizar a situação",
            "Destaque que o desconto é por tempo limitado"
          ],
          riskLevel: daysOverdue > 180 ? "alto" : daysOverdue > 90 ? "médio" : "baixo",
          confidence: 0.7
        };
      } else {
        aiResponse = {
          recommendation: autoApprovable ? "aprovar" : (withinPolicy ? "contraproposta" : "rejeitar"),
          score: withinPolicy ? 0.7 : 0.3,
          withinPolicy,
          autoApprovable,
          analysis: withinPolicy 
            ? `Proposta dentro dos parâmetros. Desconto de ${discountPercent.toFixed(1)}% solicitado.`
            : `Proposta fora dos parâmetros. Desconto máximo é ${params.max_discount_percentage}%.`,
          counterProposal: !withinPolicy ? {
            amount: totalDebt * (1 - params.max_discount_percentage / 100),
            discount: params.max_discount_percentage,
            installments: Math.min(installments || 1, params.max_installments)
          } : null,
          reasoning: autoApprovable 
            ? "Proposta pode ser aprovada automaticamente."
            : (withinPolicy ? "Proposta requer análise manual." : "Proposta excede os limites permitidos."),
          riskFactors: daysOverdue > 180 ? ["Débito muito antigo", "Risco de prescrição"] : [],
          confidence: 0.7
        };
      }
    }

    // Save analysis to database
    if (action === 'qualify' || action === 'analyze') {
      const { error: insertError } = await supabase
        .from('negotiation_history')
        .insert({
          charge_id: chargeId,
          unit_id: charge.unit?.id,
          proposed_amount: proposedAmount || totalDebt,
          original_amount: totalDebt,
          discount_percentage: proposedDiscount || ((totalDebt - (proposedAmount || totalDebt)) / totalDebt * 100),
          installments: installments || 1,
          ai_recommendation: aiResponse.recommendation || aiResponse.reasoning,
          ai_score: aiResponse.score || aiResponse.confidence,
          ai_analysis: aiResponse,
          status: aiResponse.autoApprovable ? 'approved' : 'pending',
          proposed_by: debtorMessage ? 'debtor' : 'system',
        });

      if (insertError) {
        console.error('[negotiate-ai] Error saving negotiation:', insertError);
      }
    }

    console.log('[negotiate-ai] Analysis complete:', aiResponse);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        chargeId,
        context: {
          totalDebt,
          daysOverdue,
          unit: charge.unit?.unit_number,
          condominium: charge.unit?.condominium?.name,
        },
        result: aiResponse,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[negotiate-ai] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
