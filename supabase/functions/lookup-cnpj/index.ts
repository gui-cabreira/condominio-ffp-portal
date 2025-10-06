import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      throw new Error('CNPJ é obrigatório');
    }

    // Remove any non-numeric characters from CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos');
    }

    console.log('Looking up CNPJ:', cleanCNPJ);

    const receitaWSKey = Deno.env.get('RECEITAWS_API_KEY');
    
    if (!receitaWSKey) {
      throw new Error('RECEITAWS_API_KEY não configurada');
    }

    // Call ReceitaWS API
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${receitaWSKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ReceitaWS API error:', errorText);
      throw new Error(`Erro ao consultar CNPJ: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('ReceitaWS response:', data);

    // Check if CNPJ was found
    if (data.status === 'ERROR') {
      throw new Error(data.message || 'CNPJ não encontrado');
    }

    // Transform ReceitaWS response to our format
    const companyData = {
      cnpj: data.cnpj,
      name: data.nome || data.fantasia,
      fantasyName: data.fantasia,
      legalName: data.nome,
      phone: data.telefone,
      email: data.email,
      address: {
        street: data.logradouro,
        number: data.numero,
        complement: data.complemento,
        neighborhood: data.bairro,
        city: data.municipio,
        state: data.uf,
        zipCode: data.cep,
        fullAddress: `${data.logradouro}, ${data.numero}${data.complemento ? ' - ' + data.complemento : ''} - ${data.bairro}, ${data.municipio}/${data.uf}`
      },
      activity: data.atividade_principal?.[0]?.text,
      status: data.situacao,
      openingDate: data.abertura,
      legalNature: data.natureza_juridica,
      capital: data.capital_social,
      size: data.porte,
    };

    return new Response(
      JSON.stringify({ success: true, data: companyData }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in lookup-cnpj function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao consultar CNPJ' 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
