import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateDocumentRequest {
  chargeId?: string;
  ownerId?: string;
  processId?: string;
  templateId?: string;
  documentType: string;
  useAI?: boolean;
  customInstructions?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      chargeId,
      ownerId,
      processId,
      templateId,
      documentType,
      useAI,
      customInstructions
    }: GenerateDocumentRequest = await req.json();

    console.log(`📄 Gerando documento ${documentType}`);

    // Buscar dados necessários
    const data = await fetchDocumentData(supabase, chargeId, ownerId, processId);

    // Buscar template
    let content;
    if (useAI) {
      content = await generateWithAI(documentType, data, customInstructions);
    } else {
      content = await generateFromTemplate(supabase, templateId, documentType, data);
    }

    // Salvar documento
    const { data: document } = await supabase
      .from('legal_documents')
      .insert({
        process_id: processId,
        charge_id: chargeId,
        owner_id: ownerId,
        template_id: templateId,
        document_type: documentType,
        title: generateTitle(documentType, data),
        content: content,
        generated_with_ai: useAI || false,
        ai_model: useAI ? 'gpt-4o' : null,
        generated_by: null // TODO: Pegar do auth
      })
      .select()
      .single();

    console.log(`✅ Documento gerado: ${document.id}`);

    // TODO: Gerar PDF a partir do content (usando biblioteca de PDF)
    // const pdfUrl = await generatePDF(content);

    return new Response(
      JSON.stringify({ success: true, document }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar documento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Busca todos os dados necessários para gerar o documento
 */
async function fetchDocumentData(
  supabase: any,
  chargeId?: string,
  ownerId?: string,
  processId?: string
) {
  const data: any = {};

  // Buscar cobrança
  if (chargeId) {
    const { data: charge } = await supabase
      .from('charges')
      .select(`
        *,
        owners (*),
        condominiums (*),
        administrators (*)
      `)
      .eq('id', chargeId)
      .single();

    data.charge = charge;
    data.owner = charge.owners;
    data.condominium = charge.condominiums;
    data.administrator = charge.administrators;
  }

  // Buscar owner
  if (ownerId && !data.owner) {
    const { data: owner } = await supabase
      .from('owners')
      .select('*')
      .eq('id', ownerId)
      .single();

    data.owner = owner;
  }

  // Buscar processo
  if (processId) {
    const { data: process } = await supabase
      .from('legal_processes')
      .select('*')
      .eq('id', processId)
      .single();

    data.process = process;
  }

  return data;
}

/**
 * Gera documento usando GPT-4
 */
async function generateWithAI(
  documentType: string,
  data: any,
  customInstructions?: string
) {
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
  });

  const instructions = getDocumentInstructions(documentType);

  const prompt = `${instructions}

${customInstructions ? `Instruções adicionais: ${customInstructions}\n\n` : ''}

Dados para o documento:
${JSON.stringify(data, null, 2)}

Gere o documento em formato Markdown bem formatado, com estrutura clara, parágrafos bem divididos e formatação apropriada para um documento jurídico.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Você é um advogado especialista em direito civil e recuperação de crédito. Gere documentos jurídicos precisos, formais e bem estruturados.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  return completion.choices[0].message.content || '';
}

/**
 * Retorna instruções específicas por tipo de documento
 */
function getDocumentInstructions(documentType: string): string {
  const instructions: Record<string, string> = {
    notification_letter: `Gere uma NOTIFICAÇÃO EXTRAJUDICIAL DE COBRANÇA formal e completa, incluindo:
1. Cabeçalho com identificação do notificante e notificado
2. Descrição detalhada do débito
3. Prazo para regularização (10 dias)
4. Consequências do não pagamento (protesto, negativação, ação judicial)
5. Formas de pagamento disponíveis
6. Rodapé com local, data e assinatura`,

    demand_letter: `Gere uma CARTA DE COBRANÇA formal, com tom firme mas respeitoso, incluindo:
1. Identificação das partes
2. Histórico do débito
3. Tentativas anteriores de contato
4. Valor atualizado com juros e multa
5. Ultimato para pagamento
6. Formas de contato para negociação`,

    protest_letter: `Gere um documento de APRESENTAÇÃO PARA PROTESTO EM CARTÓRIO, incluindo:
1. Identificação do apresentante e devedor
2. Natureza do título
3. Valor a ser protestado
4. Fundamentação legal
5. Documentação anexa
6. Pedido formal de protesto`,

    initial_petition: `Gere uma PETIÇÃO INICIAL DE AÇÃO DE COBRANÇA, incluindo:
1. Endereçamento ao juízo competente
2. Qualificação completa das partes
3. DOS FATOS (narrativa cronológica)
4. DO DIREITO (fundamentação legal)
5. DOS PEDIDOS (procedência, condenação, custas, honorários)
6. Valor da causa
7. Requerimentos (citação, provas, etc)`,

    settlement_agreement: `Gere um ACORDO DE PARCELAMENTO/TRANSAÇÃO, incluindo:
1. Qualificação das partes
2. Objeto do acordo
3. Condições de pagamento
4. Valores e parcelas
5. Descontos concedidos
6. Cláusulas de inadimplemento
7. Assinaturas`,

    payment_plan: `Gere um PLANO DE PAGAMENTO detalhado, incluindo:
1. Valor total do débito
2. Descontos aplicados
3. Número de parcelas
4. Valor de cada parcela
5. Datas de vencimento
6. Formas de pagamento
7. Cláusula de inadimplência`
  };

  return instructions[documentType] || 'Gere o documento solicitado de forma profissional e completa.';
}

/**
 * Gera documento a partir de template
 */
async function generateFromTemplate(
  supabase: any,
  templateId: string | undefined,
  documentType: string,
  data: any
) {
  // Buscar template
  let template;
  if (templateId) {
    const { data: t } = await supabase
      .from('legal_document_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    template = t;
  } else {
    // Buscar template padrão por tipo
    const { data: t } = await supabase
      .from('legal_document_templates')
      .select('*')
      .eq('document_type', documentType)
      .eq('is_system', true)
      .single();
    template = t;
  }

  if (!template) {
    throw new Error('Template não encontrado');
  }

  // Substituir variáveis
  return replaceTemplateVariables(template.content, data);
}

/**
 * Substitui variáveis no template
 */
function replaceTemplateVariables(template: string, data: any): string {
  const charge = data.charge || {};
  const owner = data.owner || {};
  const condominium = data.condominium || {};
  const administrator = data.administrator || {};
  const process = data.process || {};

  const variables: Record<string, string> = {
    // Administradora
    administradora_nome: administrator.name || 'Administradora',
    administradora_cnpj: administrator.cnpj || '',
    administradora_endereco: administrator.address || '',

    // Devedor
    devedor_nome: owner.name || '',
    devedor_cpf: formatCPF(owner.cpf) || '',
    devedor_endereco: owner.address || '',

    // Condomínio
    condominio: condominium.name || '',
    unidade: condominium.unit_number || '',

    // Cobrança
    competencia: formatCompetence(charge.due_date),
    vencimento: formatDate(charge.due_date),
    valor_principal: formatCurrency(charge.amount || 0),
    juros_multa: formatCurrency(calculateFees(charge)),
    valor_total: formatCurrency(calculateTotal(charge)),
    valor_total_extenso: numberToWords(calculateTotal(charge)),
    dias_atraso: calculateDaysOverdue(charge.due_date).toString(),

    // Pagamento
    pix: administrator.pix_key || '',
    link_boleto: `https://ffp-portal.com/pay/${charge.id}`,
    dados_bancarios: administrator.bank_info || '',
    contato: administrator.phone || administrator.email || '',

    // Processo
    numero_processo: process.process_number || '',

    // Datas
    cidade: 'São Paulo', // TODO: Pegar da administradora
    data: new Date().toLocaleDateString('pt-BR'),
    data_extenso: formatDateExtensive(new Date()),
    data_notificacao: formatDate(charge.created_at)
  };

  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Gera título do documento
 */
function generateTitle(documentType: string, data: any): string {
  const titles: Record<string, string> = {
    notification_letter: `Notificação Extrajudicial - ${data.owner?.name || 'Devedor'}`,
    demand_letter: `Carta de Cobrança - ${data.owner?.name || 'Devedor'}`,
    protest_letter: `Apresentação para Protesto - ${data.owner?.name || 'Devedor'}`,
    initial_petition: `Petição Inicial - Ação de Cobrança`,
    settlement_agreement: `Acordo de Parcelamento - ${data.owner?.name || 'Devedor'}`,
    payment_plan: `Plano de Pagamento - ${data.owner?.name || 'Devedor'}`
  };

  return titles[documentType] || 'Documento Jurídico';
}

// Funções auxiliares
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateExtensive(date: Date): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

function formatCompetence(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatCPF(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function calculateDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calculateFees(charge: any): number {
  if (!charge) return 0;
  const daysOverdue = calculateDaysOverdue(charge.due_date);
  const interest = charge.amount * 0.01 * daysOverdue; // 1% ao dia
  const fine = charge.amount * 0.02; // 2% de multa
  return interest + fine;
}

function calculateTotal(charge: any): number {
  if (!charge) return 0;
  return charge.amount + calculateFees(charge);
}

function numberToWords(value: number): string {
  // Implementação simplificada
  // TODO: Implementar conversão completa por extenso
  return `${formatCurrency(value)} (valor por extenso)`;
}
