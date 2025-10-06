import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('Nenhum arquivo enviado')
    }

    console.log('Processando boleto:', file.name, 'Tipo:', file.type)

    // Validar tipo de arquivo - apenas imagens
    if (!file.type.startsWith('image/')) {
      throw new Error('Por favor, envie apenas imagens (PNG, JPG, JPEG). Para PDFs, tire uma foto ou screenshot do boleto.')
    }

    // Converter arquivo para base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Chamar Lovable AI com visão para processar o boleto
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada')
    }

    console.log('Enviando para AI Gateway...')

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extrair dados de boletos de condomínio.
Analise a imagem do boleto e extraia as seguintes informações em formato JSON:
{
  "administradora": {
    "nome": "nome da administradora",
    "cnpj": "CNPJ se disponível"
  },
  "condominio": {
    "nome": "nome do condomínio",
    "endereco": "endereço completo se disponível"
  },
  "inadimplente": {
    "nome": "nome completo do devedor",
    "cpf": "CPF se disponível",
    "email": "email se disponível",
    "telefone": "telefone se disponível",
    "unidade": "número da unidade/apartamento"
  },
  "cobranca": {
    "valor": número do valor total,
    "vencimento": "data de vencimento no formato YYYY-MM-DD",
    "competencia": "mês/ano de referência",
    "descricao": "descrição da cobrança"
  }
}

Retorne APENAS o JSON, sem texto adicional. Se algum campo não estiver disponível, use null.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64}`
                }
              },
              {
                type: 'text',
                text: 'Extraia todos os dados deste boleto de condomínio.'
              }
            ]
          }
        ],
        temperature: 0.1
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Erro da AI:', aiResponse.status, errorText)
      throw new Error(`Erro ao processar com IA: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    console.log('Resposta da AI:', JSON.stringify(aiData))

    const extractedText = aiData.choices[0].message.content
    console.log('Texto extraído:', extractedText)

    // Parse do JSON extraído
    let extractedData
    try {
      // Remover possíveis markdown code blocks
      const cleanText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extractedData = JSON.parse(cleanText)
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', e)
      throw new Error('Erro ao processar dados extraídos da IA')
    }

    console.log('Dados extraídos:', JSON.stringify(extractedData))

    // Buscar ou criar administradora
    let administratorId = null
    if (extractedData.administradora?.nome) {
      const { data: existingAdmin } = await supabaseClient
        .from('administrators')
        .select('id')
        .ilike('name', extractedData.administradora.nome)
        .maybeSingle()

      if (existingAdmin) {
        administratorId = existingAdmin.id
        console.log('Administradora encontrada:', administratorId)
      } else {
        const { data: newAdmin, error: adminError } = await supabaseClient
          .from('administrators')
          .insert({
            name: extractedData.administradora.nome,
            cnpj: extractedData.administradora.cnpj,
            active: true
          })
          .select()
          .single()

        if (adminError) throw adminError
        administratorId = newAdmin.id
        console.log('Administradora criada:', administratorId)
      }
    }

    // Buscar ou criar condomínio
    let condominiumId = null
    if (extractedData.condominio?.nome) {
      const { data: existingCondo } = await supabaseClient
        .from('condominiums')
        .select('id')
        .ilike('name', extractedData.condominio.nome)
        .maybeSingle()

      if (existingCondo) {
        condominiumId = existingCondo.id
        console.log('Condomínio encontrado:', condominiumId)
      } else {
        const { data: newCondo, error: condoError } = await supabaseClient
          .from('condominiums')
          .insert({
            name: extractedData.condominio.nome,
            address: extractedData.condominio.endereco,
            administrator_id: administratorId,
            total_units: 0
          })
          .select()
          .single()

        if (condoError) throw condoError
        condominiumId = newCondo.id
        console.log('Condomínio criado:', condominiumId)
      }
    }

    // Buscar ou criar unidade
    let unitId = null
    if (condominiumId && extractedData.inadimplente?.unidade) {
      const { data: existingUnit } = await supabaseClient
        .from('units')
        .select('id')
        .eq('condominium_id', condominiumId)
        .eq('unit_number', extractedData.inadimplente.unidade)
        .maybeSingle()

      if (existingUnit) {
        unitId = existingUnit.id
        console.log('Unidade encontrada:', unitId)
      } else {
        const { data: newUnit, error: unitError } = await supabaseClient
          .from('units')
          .insert({
            condominium_id: condominiumId,
            unit_number: extractedData.inadimplente.unidade,
            owner_name: extractedData.inadimplente.nome,
            owner_email: extractedData.inadimplente.email,
            owner_phone: extractedData.inadimplente.telefone
          })
          .select()
          .single()

        if (unitError) throw unitError
        unitId = newUnit.id
        console.log('Unidade criada:', unitId)
      }
    }

    // Criar cobrança
    let chargeId = null
    if (unitId && extractedData.cobranca?.valor) {
      const { data: newCharge, error: chargeError } = await supabaseClient
        .from('charges')
        .insert({
          unit_id: unitId,
          administrator_id: administratorId,
          amount: extractedData.cobranca.valor,
          due_date: extractedData.cobranca.vencimento,
          reference_month: extractedData.cobranca.competencia ? new Date(extractedData.cobranca.competencia).toISOString() : null,
          description: extractedData.cobranca.descricao,
          status: 'pending'
        })
        .select()
        .single()

      if (chargeError) throw chargeError
      chargeId = newCharge.id
      console.log('Cobrança criada:', chargeId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Boleto processado com sucesso!',
        data: {
          extracted: extractedData,
          created: {
            administratorId,
            condominiumId,
            unitId,
            chargeId
          }
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Erro ao processar boleto:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})