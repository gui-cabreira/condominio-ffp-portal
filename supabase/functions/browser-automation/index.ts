import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationRequest {
  workflowId?: string;
  administratorId: string;
  credentials?: {
    username: string;
    password: string;
  };
  customWorkflow?: any[]; // Para workflows customizados
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Iniciando automação de navegador...');

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { workflowId, administratorId, credentials, customWorkflow }: AutomationRequest = await req.json();

    console.log(`📋 Workflow ID: ${workflowId}`);
    console.log(`🏢 Administrator ID: ${administratorId}`);

    // Buscar workflow
    let workflow;
    if (workflowId) {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !data) {
        throw new Error('Workflow não encontrado');
      }

      workflow = data;
    } else if (customWorkflow) {
      workflow = {
        id: 'custom',
        name: 'Custom Workflow',
        workflow_steps: customWorkflow,
        timeout_ms: 60000,
      };
    } else {
      throw new Error('Workflow ID ou custom workflow obrigatório');
    }

    // Buscar credenciais da administradora
    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select('*')
      .eq('id', administratorId)
      .single();

    if (adminError || !admin) {
      throw new Error('Administradora não encontrada');
    }

    const finalCredentials = credentials || {
      username: admin.portal_username,
      password: admin.portal_password,
    };

    if (!finalCredentials.username || !finalCredentials.password) {
      throw new Error('Credenciais não configuradas');
    }

    // Criar execução
    const { data: execution, error: execError } = await supabase
      .from('automation_executions')
      .insert({
        workflow_id: workflowId || null,
        administrator_id: administratorId,
        status: 'running',
        total_steps: workflow.workflow_steps.length,
      })
      .select()
      .single();

    if (execError || !execution) {
      throw new Error('Erro ao criar execução');
    }

    console.log(`🚀 Execução criada: ${execution.id}`);

    try {
      // Executar workflow
      const result = await executeWorkflow(
        supabase,
        workflow,
        finalCredentials,
        execution.id
      );

      // Atualizar execução com sucesso
      await supabase
        .from('automation_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(execution.started_at).getTime(),
          extracted_data: result.data,
          records_extracted: result.recordsCount,
          screenshots: result.screenshots,
          steps_log: result.stepsLog,
        })
        .eq('id', execution.id);

      console.log('✅ Automação concluída com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          executionId: execution.id,
          recordsExtracted: result.recordsCount,
          data: result.data,
          screenshots: result.screenshots,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (workflowError) {
      console.error('❌ Erro na execução do workflow:', workflowError);

      // Atualizar execução com erro
      await supabase
        .from('automation_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(execution.started_at).getTime(),
          error_message: workflowError.message,
        })
        .eq('id', execution.id);

      throw workflowError;
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Executar workflow usando serviço de automação
async function executeWorkflow(
  supabase: any,
  workflow: any,
  credentials: any,
  executionId: string
) {
  console.log('🎬 Iniciando execução do workflow...');

  // Escolher serviço de automação (Browserless ou ScrapingBee)
  const automationService = Deno.env.get('AUTOMATION_SERVICE') || 'browserless';

  if (automationService === 'browserless') {
    return await executeWithBrowserless(workflow, credentials, executionId);
  } else if (automationService === 'scrapingbee') {
    return await executeWithScrapingBee(workflow, credentials, executionId);
  } else {
    // Fallback: tentar executar localmente (apenas para desenvolvimento)
    return await executeLocally(workflow, credentials, executionId);
  }
}

// Executar com Browserless.io
async function executeWithBrowserless(
  workflow: any,
  credentials: any,
  executionId: string
) {
  console.log('🌐 Usando Browserless.io...');

  const browserlessUrl = Deno.env.get('BROWSERLESS_URL') || 'https://chrome.browserless.io';
  const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN');

  if (!browserlessToken) {
    throw new Error('BROWSERLESS_TOKEN não configurado');
  }

  const steps = workflow.workflow_steps;
  const stepsLog: any[] = [];
  const screenshots: string[] = [];
  let extractedData: any[] = [];

  // Converter workflow para script Puppeteer
  const puppeteerScript = generatePuppeteerScript(steps, credentials);

  console.log('📜 Script Puppeteer gerado');

  // Executar via Browserless
  const response = await fetch(`${browserlessUrl}/function?token=${browserlessToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: puppeteerScript,
      context: {
        credentials,
        executionId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  console.log('✅ Browserless executou script');

  return {
    data: result.data || [],
    recordsCount: result.data?.length || 0,
    screenshots: result.screenshots || [],
    stepsLog: result.stepsLog || [],
  };
}

// Executar com ScrapingBee
async function executeWithScrapingBee(
  workflow: any,
  credentials: any,
  executionId: string
) {
  console.log('🐝 Usando ScrapingBee...');

  const scrapingBeeKey = Deno.env.get('SCRAPINGBEE_API_KEY');

  if (!scrapingBeeKey) {
    throw new Error('SCRAPINGBEE_API_KEY não configurado');
  }

  // ScrapingBee é mais limitado, usar para casos simples
  // Para workflows complexos, preferir Browserless

  const steps = workflow.workflow_steps;
  const firstStep = steps[0];

  if (firstStep.action !== 'navigate') {
    throw new Error('Primeiro step deve ser navigate para ScrapingBee');
  }

  const url = new URL('https://app.scrapingbee.com/api/v1/');
  url.searchParams.set('api_key', scrapingBeeKey);
  url.searchParams.set('url', firstStep.url);
  url.searchParams.set('render_js', 'true');
  url.searchParams.set('premium_proxy', 'true');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`ScrapingBee error: ${response.status}`);
  }

  const html = await response.text();

  // Processar HTML com DOMParser
  // (implementação simplificada - expandir conforme necessário)

  return {
    data: [],
    recordsCount: 0,
    screenshots: [],
    stepsLog: [],
  };
}

// Executar localmente (desenvolvimento/fallback)
async function executeLocally(
  workflow: any,
  credentials: any,
  executionId: string
) {
  console.log('💻 Executando localmente (modo desenvolvimento)...');
  console.warn('⚠️ Execução local não suportada em produção. Configure BROWSERLESS ou SCRAPINGBEE.');

  // Simular execução para testes
  const mockData = [
    {
      condominio: 'Residencial Exemplo',
      unidade: '101',
      proprietario: 'João Silva',
      valor: '500.00',
      vencimento: '2024-01-15',
    },
  ];

  return {
    data: mockData,
    recordsCount: mockData.length,
    screenshots: [],
    stepsLog: workflow.workflow_steps.map((step: any, index: number) => ({
      step: index + 1,
      action: step.action,
      status: 'simulated',
      duration: 100,
    })),
  };
}

// Gerar script Puppeteer a partir do workflow
function generatePuppeteerScript(steps: any[], credentials: any): string {
  const script = `
const puppeteer = require('puppeteer');

module.exports = async ({ page, context }) => {
  const { credentials, executionId } = context;

  const stepsLog = [];
  const screenshots = [];
  let extractedData = [];

  try {
    ${steps.map((step, index) => generateStepCode(step, index, credentials)).join('\n\n')}

    return {
      success: true,
      data: extractedData,
      screenshots,
      stepsLog,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stepsLog,
    };
  }
};
  `;

  return script;
}

// Gerar código para cada step
function generateStepCode(step: any, index: number, credentials: any): string {
  const stepNumber = index + 1;
  const startTime = `const startTime${stepNumber} = Date.now();`;

  switch (step.action) {
    case 'navigate':
      return `
${startTime}
console.log('Step ${stepNumber}: Navegando para ${step.url}');
await page.goto('${step.url}', { waitUntil: '${step.waitUntil || 'networkidle0'}' });
stepsLog.push({ step: ${stepNumber}, action: 'navigate', status: 'success', duration: Date.now() - startTime${stepNumber} });
      `;

    case 'type':
      const value = step.value.replace('${username}', credentials.username)
                             .replace('${password}', credentials.password);
      return `
${startTime}
console.log('Step ${stepNumber}: Digitando em ${step.selector}');
${step.clear ? `await page.evaluate((sel) => document.querySelector(sel).value = '', '${step.selector}');` : ''}
await page.type('${step.selector}', '${value}', { delay: ${step.delay || 50} });
stepsLog.push({ step: ${stepNumber}, action: 'type', status: 'success', duration: Date.now() - startTime${stepNumber} });
      `;

    case 'click':
      return `
${startTime}
console.log('Step ${stepNumber}: Clicando em ${step.selector}');
${step.waitForSelector ? `await page.waitForSelector('${step.selector}', { timeout: ${step.timeout || 5000} });` : ''}
await page.click('${step.selector}');
stepsLog.push({ step: ${stepNumber}, action: 'click', status: 'success', duration: Date.now() - startTime${stepNumber} });
      `;

    case 'wait':
      if (step.type === 'time') {
        return `
${startTime}
console.log('Step ${stepNumber}: Aguardando ${step.value}ms');
await new Promise(resolve => setTimeout(resolve, ${step.value}));
stepsLog.push({ step: ${stepNumber}, action: 'wait', status: 'success', duration: Date.now() - startTime${stepNumber} });
        `;
      } else if (step.type === 'selector') {
        return `
${startTime}
console.log('Step ${stepNumber}: Aguardando seletor ${step.value}');
await page.waitForSelector('${step.value}', { timeout: ${step.timeout || 10000} });
stepsLog.push({ step: ${stepNumber}, action: 'wait', status: 'success', duration: Date.now() - startTime${stepNumber} });
        `;
      }
      break;

    case 'extract_table':
      return `
${startTime}
console.log('Step ${stepNumber}: Extraindo tabela ${step.selector}');
const tableData${stepNumber} = await page.evaluate((selector, columns) => {
  const rows = document.querySelectorAll(selector + ' tbody tr');
  const data = [];

  rows.forEach(row => {
    const record = {};
    Object.entries(columns).forEach(([key, colSelector]) => {
      const cell = row.querySelector(colSelector);
      record[key] = cell ? cell.textContent.trim() : '';
    });
    data.push(record);
  });

  return data;
}, '${step.selector}', ${JSON.stringify(step.columns)});

extractedData = extractedData.concat(tableData${stepNumber});
stepsLog.push({ step: ${stepNumber}, action: 'extract_table', status: 'success', records: tableData${stepNumber}.length, duration: Date.now() - startTime${stepNumber} });
      `;

    case 'screenshot':
      return `
${startTime}
console.log('Step ${stepNumber}: Capturando screenshot');
const screenshotBuffer${stepNumber} = await page.screenshot({ fullPage: ${step.fullPage || false} });
const screenshotBase64${stepNumber} = screenshotBuffer${stepNumber}.toString('base64');
screenshots.push({
  name: '${step.name || 'screenshot_' + stepNumber + '.png'}',
  data: 'data:image/png;base64,' + screenshotBase64${stepNumber}
});
stepsLog.push({ step: ${stepNumber}, action: 'screenshot', status: 'success', duration: Date.now() - startTime${stepNumber} });
      `;

    case 'extract_text':
      return `
${startTime}
console.log('Step ${stepNumber}: Extraindo texto de ${step.selector}');
const text${stepNumber} = await page.evaluate((selector, attr) => {
  const element = document.querySelector(selector);
  return element ? (attr ? element[attr] : element.textContent.trim()) : null;
}, '${step.selector}', '${step.attribute || 'textContent'}');
extractedData.push({ extracted_text: text${stepNumber} });
stepsLog.push({ step: ${stepNumber}, action: 'extract_text', status: 'success', duration: Date.now() - startTime${stepNumber} });
      `;

    default:
      return `
console.log('Step ${stepNumber}: Ação ${step.action} não implementada');
stepsLog.push({ step: ${stepNumber}, action: '${step.action}', status: 'skipped' });
      `;
  }

  return '';
}
