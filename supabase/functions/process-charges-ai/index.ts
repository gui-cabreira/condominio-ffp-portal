import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('API_OPENAI')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { content, administratorId, fileName } = await req.json();
    
    console.log('Processing charges with AI for administrator:', administratorId);

    // Criar registro de importação
    const { data: importRecord, error: importError } = await supabase
      .from('charge_imports')
      .insert({
        administrator_id: administratorId,
        file_name: fileName,
        original_content: content,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Error creating import record:', importError);
      throw importError;
    }

    console.log('Import record created:', importRecord.id);

    // Processar com IA para extrair dados estruturados
    const aiPrompt = `
Você é um assistente especializado em análise de dados financeiros de condomínios.
Analise o seguinte conteúdo e extraia informações de cobranças:

CONTEÚDO:
${content}

Extraia as seguintes informações em formato JSON válido:
{
  "charges": [
    {
      "unit_number": "string - número da unidade (ex: 101, 201A)",
      "owner_name": "string - nome do proprietário",
      "amount": "number - valor da cobrança",
      "due_date": "string - data de vencimento (YYYY-MM-DD)",
      "description": "string - descrição da cobrança",
      "reference_month": "string - mês de referência (YYYY-MM-01)"
    }
  ],
  "condominium_info": {
    "name": "string - nome do condomínio",
    "total_units": "number - total de unidades encontradas"
  }
}

REGRAS IMPORTANTES:
1. Extraia apenas informações claras e precisas
2. Se não encontrar uma informação, use null
3. Valores monetários devem ser números (sem R$, vírgulas como pontos)
4. Datas no formato YYYY-MM-DD
5. Se não conseguir identificar cobranças, retorne array vazio
6. Seja conservador: melhor não extrair do que extrair errado

Responda APENAS com o JSON válido, sem explicações adicionais.
`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de dados financeiros de condomínios. Responda sempre com JSON válido.' },
          { role: 'user', content: aiPrompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    
    console.log('AI extracted data:', extractedData);

    let successfulImports = 0;
    let failedImports = 0;
    const errors: string[] = [];

    // Buscar ou criar condomínio
    let condominiumId = null;
    if (extractedData.condominium_info?.name) {
      const { data: existingCondo } = await supabase
        .from('condominiums')
        .select('id')
        .eq('name', extractedData.condominium_info.name)
        .single();

      if (existingCondo) {
        condominiumId = existingCondo.id;
      } else {
        const { data: newCondo, error: condoError } = await supabase
          .from('condominiums')
          .insert({
            name: extractedData.condominium_info.name,
            total_units: extractedData.condominium_info.total_units || 0,
            administrator_id: administratorId
          })
          .select()
          .single();

        if (condoError) {
          console.error('Error creating condominium:', condoError);
          errors.push(`Erro ao criar condomínio: ${condoError.message}`);
        } else {
          condominiumId = newCondo.id;
        }
      }
    }

    // Processar cada cobrança extraída
    for (const charge of extractedData.charges || []) {
      try {
        // Buscar ou criar unidade
        let unitId = null;
        if (condominiumId && charge.unit_number) {
          const { data: existingUnit } = await supabase
            .from('units')
            .select('id')
            .eq('condominium_id', condominiumId)
            .eq('unit_number', charge.unit_number)
            .single();

          if (existingUnit) {
            unitId = existingUnit.id;
          } else {
            const { data: newUnit, error: unitError } = await supabase
              .from('units')
              .insert({
                condominium_id: condominiumId,
                unit_number: charge.unit_number,
                owner_name: charge.owner_name
              })
              .select()
              .single();

            if (unitError) {
              console.error('Error creating unit:', unitError);
              errors.push(`Erro ao criar unidade ${charge.unit_number}: ${unitError.message}`);
              failedImports++;
              continue;
            } else {
              unitId = newUnit.id;
            }
          }
        }

        // Criar cobrança
        if (unitId) {
          const { error: chargeError } = await supabase
            .from('charges')
            .insert({
              unit_id: unitId,
              amount: charge.amount,
              due_date: charge.due_date,
              description: charge.description || 'Cobrança importada via IA',
              reference_month: charge.reference_month,
              import_id: importRecord.id,
              administrator_id: administratorId,
              status: 'pending'
            });

          if (chargeError) {
            console.error('Error creating charge:', chargeError);
            errors.push(`Erro ao criar cobrança para unidade ${charge.unit_number}: ${chargeError.message}`);
            failedImports++;
          } else {
            successfulImports++;
          }
        } else {
          errors.push(`Não foi possível identificar unidade para ${charge.unit_number}`);
          failedImports++;
        }
      } catch (error) {
        console.error('Error processing charge:', error);
        errors.push(`Erro ao processar cobrança: ${error.message}`);
        failedImports++;
      }
    }

    // Atualizar registro de importação
    const { error: updateError } = await supabase
      .from('charge_imports')
      .update({
        processed_content: extractedData,
        total_charges: extractedData.charges?.length || 0,
        successful_imports: successfulImports,
        failed_imports: failedImports,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        error_log: errors.length > 0 ? errors.join('\n') : null
      })
      .eq('id', importRecord.id);

    if (updateError) {
      console.error('Error updating import record:', updateError);
    }

    console.log(`Import completed: ${successfulImports} successful, ${failedImports} failed`);

    return new Response(JSON.stringify({
      success: true,
      importId: importRecord.id,
      totalCharges: extractedData.charges?.length || 0,
      successfulImports,
      failedImports,
      errors: errors.length > 0 ? errors : null,
      extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-charges-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});