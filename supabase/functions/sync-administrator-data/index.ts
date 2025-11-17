import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  administratorId: string;
  syncType?: 'manual' | 'scheduled' | 'webhook';
  forceSync?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando sincronização com administradora...');

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { administratorId, syncType = 'manual', forceSync = false }: SyncRequest = await req.json();

    if (!administratorId) {
      throw new Error('Administrator ID is required');
    }

    console.log(`📋 Administradora ID: ${administratorId}`);
    console.log(`📋 Tipo de sincronização: ${syncType}`);

    // Buscar dados da administradora
    const { data: administrator, error: adminError } = await supabase
      .from('administrators')
      .select(`
        *,
        management_systems (
          id,
          name,
          description
        )
      `)
      .eq('id', administratorId)
      .single();

    if (adminError || !administrator) {
      throw new Error('Administradora não encontrada');
    }

    console.log(`🏢 Administradora: ${administrator.name}`);

    // Verificar se tem credenciais configuradas
    if (!administrator.portal_url || !administrator.portal_username || !administrator.portal_password) {
      throw new Error('Credenciais do portal não configuradas para esta administradora');
    }

    // Buscar configuração de sincronização
    const { data: syncConfig } = await supabase
      .from('administrator_sync_config')
      .select('*')
      .eq('administrator_id', administratorId)
      .single();

    // Buscar template de scraping para o sistema de gestão
    let template = null;
    if (administrator.management_system_id) {
      const { data: templateData } = await supabase
        .from('management_system_templates')
        .select('*')
        .eq('management_system_id', administrator.management_system_id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      template = templateData;
    }

    // Criar registro de log de sincronização
    const { data: syncLog, error: logError } = await supabase
      .from('administrator_sync_logs')
      .insert({
        administrator_id: administratorId,
        sync_type: syncType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error('Erro ao criar log de sincronização');
    }

    console.log(`📝 Log de sincronização criado: ${syncLog.id}`);

    try {
      // **NOVO: Verificar se existe workflow de automação disponível**
      let automationWorkflow = null;
      if (administrator.management_system_id) {
        const { data: workflowData } = await supabase
          .from('automation_workflows')
          .select('*')
          .eq('management_system_id', administrator.management_system_id)
          .eq('active', true)
          .order('success_rate', { ascending: false })
          .limit(1)
          .single();

        automationWorkflow = workflowData;
      }

      let syncResult;

      // Se existe workflow de automação, tentar usar primeiro
      if (automationWorkflow) {
        console.log(`🤖 Workflow de automação encontrado: ${automationWorkflow.name}`);
        try {
          syncResult = await syncViaAutomation(supabase, administrator, automationWorkflow, syncLog.id);
          console.log('✅ Sincronização via automação bem-sucedida');
        } catch (autoError) {
          console.error('⚠️ Automação falhou, tentando método tradicional:', autoError);
          // Fallback para métodos tradicionais
          const authType = syncConfig?.auth_type || 'credentials';
          syncResult = await syncViaTraditionalMethod(authType, administrator, syncConfig, template, supabase);
        }
      } else {
        // Método tradicional
        const authType = syncConfig?.auth_type || 'credentials';
        syncResult = await syncViaTraditionalMethod(authType, administrator, syncConfig, template, supabase);
      }

      // Processar dados obtidos
      const processResult = await processAndSaveData(
        supabase,
        administratorId,
        syncResult.data,
        syncLog.id
      );

      // Atualizar log de sincronização com sucesso
      await supabase
        .from('administrator_sync_logs')
        .update({
          status: processResult.errors.length > 0 ? 'partial' : 'completed',
          completed_at: new Date().toISOString(),
          total_records_fetched: syncResult.data.length,
          new_condominiums: processResult.stats.newCondominiums,
          updated_condominiums: processResult.stats.updatedCondominiums,
          new_units: processResult.stats.newUnits,
          updated_units: processResult.stats.updatedUnits,
          new_charges: processResult.stats.newCharges,
          updated_charges: processResult.stats.updatedCharges,
          errors_count: processResult.errors.length,
          raw_data: syncResult.rawData,
          parsed_data: syncResult.data,
          errors: processResult.errors,
        })
        .eq('id', syncLog.id);

      // Atualizar última sincronização da administradora
      await supabase
        .from('administrators')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: processResult.errors.length > 0 ? 'partial' : 'success',
          sync_error_message: null,
        })
        .eq('id', administratorId);

      // Atualizar próxima sincronização se for automática
      if (syncConfig?.auto_sync_enabled) {
        const nextSync = calculateNextSyncTime(syncConfig.sync_frequency, syncConfig.sync_time);
        await supabase
          .from('administrator_sync_config')
          .update({
            last_sync_at: new Date().toISOString(),
            next_sync_at: nextSync,
          })
          .eq('administrator_id', administratorId);
      }

      console.log('✅ Sincronização concluída com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          syncLogId: syncLog.id,
          stats: processResult.stats,
          errors: processResult.errors,
          message: `Sincronização concluída. ${processResult.stats.newCharges} novas cobranças importadas.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (syncError) {
      console.error('❌ Erro durante sincronização:', syncError);

      // Atualizar log com erro
      await supabase
        .from('administrator_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ message: syncError.message, stack: syncError.stack }],
        })
        .eq('id', syncLog.id);

      // Atualizar status da administradora
      await supabase
        .from('administrators')
        .update({
          last_sync_status: 'failed',
          sync_error_message: syncError.message,
        })
        .eq('id', administratorId);

      throw syncError;
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// **NOVO: Sincronização via automação de navegador**
async function syncViaAutomation(
  supabase: any,
  administrator: any,
  workflow: any,
  syncLogId: string
) {
  console.log('🤖 Usando automação de navegador...');

  // Invocar Edge Function de automação
  const { data, error } = await supabase.functions.invoke('browser-automation', {
    body: {
      workflowId: workflow.id,
      administratorId: administrator.id,
      credentials: {
        username: administrator.portal_username,
        password: administrator.portal_password,
      },
    },
  });

  if (error) {
    throw new Error(`Automação falhou: ${error.message}`);
  }

  if (!data.success) {
    throw new Error('Automação retornou falha');
  }

  console.log(`✅ Dados extraídos via automação: ${data.recordsExtracted} registros`);

  // Aplicar mapeamento de dados do workflow
  const mappedData = applyDataMapping(data.data, workflow.data_mapping);

  return {
    rawData: data.data,
    data: mappedData,
    screenshots: data.screenshots,
    method: 'automation',
  };
}

// Aplicar mapeamento de dados
function applyDataMapping(data: any[], mapping: any): any[] {
  if (!mapping) return data;

  return data.map((record: any) => {
    const mapped: any = {};

    Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
      if (record[sourceKey] !== undefined) {
        mapped[targetKey as string] = record[sourceKey];
      }
    });

    return mapped;
  });
}

// **NOVO: Método unificado tradicional**
async function syncViaTraditionalMethod(
  authType: string,
  administrator: any,
  syncConfig: any,
  template: any,
  supabase: any
) {
  switch (authType) {
    case 'api_key':
      return await syncViaAPI(administrator, syncConfig, template);
    case 'scraping':
    case 'credentials':
    default:
      return await syncViaScraping(administrator, syncConfig, template, supabase);
  }
}

// Sincronização via API
async function syncViaAPI(administrator: any, syncConfig: any, template: any) {
  console.log('🔌 Sincronizando via API...');

  const apiEndpoint = syncConfig?.api_endpoint || template?.charges_url;
  const apiKey = syncConfig?.api_key;

  if (!apiEndpoint) {
    throw new Error('API endpoint não configurado');
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(apiEndpoint, { headers });

  if (!response.ok) {
    throw new Error(`API retornou status ${response.status}`);
  }

  const data = await response.json();

  return {
    rawData: data,
    data: Array.isArray(data) ? data : [data],
  };
}

// Sincronização via Scraping
async function syncViaScraping(
  administrator: any,
  syncConfig: any,
  template: any,
  supabase: any
) {
  console.log('🕷️ Sincronizando via Scraping...');

  const loginUrl = template?.login_url || administrator.portal_url;
  const chargesUrl = template?.charges_url;

  if (!loginUrl) {
    throw new Error('URL de login não configurada');
  }

  // IMPORTANTE: Em produção, considere usar um serviço de scraping dedicado
  // como ScrapingBee, Bright Data, ou uma instância de Puppeteer em container

  // Para esta implementação, vamos usar uma abordagem híbrida:
  // 1. Tentar fazer login e obter HTML
  // 2. Parsear HTML com DOMParser
  // 3. Se falhar, usar IA (GPT) para extrair dados

  console.log('🔐 Fazendo login no portal...');

  // Fazer login (exemplo simplificado - em produção, precisa tratar cookies, CSRF, etc)
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: administrator.portal_username,
      password: administrator.portal_password,
    }),
  });

  if (!loginResponse.ok) {
    // Se login falhar, tentar usar IA para processar a página
    console.log('⚠️ Login tradicional falhou, tentando abordagem com IA...');
    return await syncWithAI(administrator, supabase);
  }

  // Obter cookies da sessão
  const cookies = loginResponse.headers.get('set-cookie') || '';

  console.log('📄 Buscando dados do portal...');

  // Buscar página de cobranças
  const dataUrl = chargesUrl || `${loginUrl}/inadimplentes`;
  const dataResponse = await fetch(dataUrl, {
    headers: {
      'Cookie': cookies,
    },
  });

  if (!dataResponse.ok) {
    throw new Error(`Erro ao buscar dados: ${dataResponse.status}`);
  }

  const html = await dataResponse.text();

  // Parsear HTML
  const parsedData = parseHTMLData(html, template);

  return {
    rawData: html,
    data: parsedData,
  };
}

// Parser de HTML usando template
function parseHTMLData(html: string, template: any): any[] {
  console.log('🔍 Parseando HTML...');

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  if (!doc) {
    throw new Error('Erro ao parsear HTML');
  }

  const extractionRules = template?.data_extraction_rules?.charges;
  if (!extractionRules) {
    throw new Error('Regras de extração não configuradas no template');
  }

  const results: any[] = [];

  // Buscar tabela de dados
  const rows = doc.querySelectorAll(extractionRules.row_selector);

  rows.forEach((row: any) => {
    const record: any = {};

    // Extrair cada coluna conforme mapeamento
    Object.entries(extractionRules.columns).forEach(([key, selector]: [string, any]) => {
      const cell = row.querySelector(selector);
      record[key] = cell?.textContent?.trim() || '';
    });

    if (Object.keys(record).length > 0) {
      results.push(record);
    }
  });

  console.log(`✅ ${results.length} registros extraídos do HTML`);

  return results;
}

// Sincronização usando IA quando scraping tradicional falha
async function syncWithAI(administrator: any, supabase: any) {
  console.log('🤖 Usando IA para extrair dados...');

  // Esta é uma abordagem alternativa que usa a IA para processar
  // Pode ser útil quando o portal tem estrutura complexa ou dinâmica

  const openaiApiKey = Deno.env.get('API_OPENAI');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key não configurada');
  }

  // Aqui você poderia:
  // 1. Usar GPT-4 Vision para fazer screenshots e extrair dados
  // 2. Usar GPT-4 para parsear HTML complexo
  // 3. Usar um serviço de scraping terceiro e processar resultado

  // Por ora, retornar erro informativo
  throw new Error(
    'Scraping tradicional falhou. Configure um serviço de scraping dedicado ou use API.'
  );
}

// Processar e salvar dados no banco
async function processAndSaveData(
  supabase: any,
  administratorId: string,
  data: any[],
  syncLogId: string
) {
  console.log(`💾 Processando ${data.length} registros...`);

  const stats = {
    newCondominiums: 0,
    updatedCondominiums: 0,
    newUnits: 0,
    updatedUnits: 0,
    newCharges: 0,
    updatedCharges: 0,
  };

  const errors: any[] = [];

  for (const record of data) {
    try {
      // Processar cada registro
      // 1. Encontrar ou criar condomínio
      const condominiumName = record.condominio || record.condominium_name;

      let { data: condominium } = await supabase
        .from('condominiums')
        .select('id')
        .eq('name', condominiumName)
        .eq('administrator_id', administratorId)
        .single();

      if (!condominium) {
        const { data: newCondo, error: condoError } = await supabase
          .from('condominiums')
          .insert({
            name: condominiumName,
            administrator_id: administratorId,
            address: record.endereco || '',
          })
          .select()
          .single();

        if (condoError) {
          errors.push({ record, error: condoError.message });
          continue;
        }

        condominium = newCondo;
        stats.newCondominiums++;
      }

      // 2. Encontrar ou criar unidade
      const unitNumber = record.unidade || record.unit_number;

      let { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('unit_number', unitNumber)
        .single();

      if (!unit) {
        const { data: newUnit, error: unitError } = await supabase
          .from('units')
          .insert({
            condominium_id: condominium.id,
            unit_number: unitNumber,
            owner_name: record.proprietario || record.owner_name || '',
            owner_cpf: record.cpf || '',
            owner_phone: record.telefone || record.phone || '',
            owner_email: record.email || '',
          })
          .select()
          .single();

        if (unitError) {
          errors.push({ record, error: unitError.message });
          continue;
        }

        unit = newUnit;
        stats.newUnits++;
      }

      // 3. Criar ou atualizar cobrança
      const amount = parseFloat(record.valor || record.amount || '0');
      const dueDate = record.vencimento || record.due_date;
      const referenceMonth = record.referencia || record.reference_month;

      // Verificar se cobrança já existe
      const { data: existingCharge } = await supabase
        .from('charges')
        .select('id, status')
        .eq('unit_id', unit.id)
        .eq('due_date', dueDate)
        .eq('reference_month', referenceMonth)
        .single();

      if (existingCharge) {
        // Atualizar apenas se status for 'pending' ou 'overdue'
        if (existingCharge.status === 'pending' || existingCharge.status === 'overdue') {
          await supabase
            .from('charges')
            .update({
              amount,
              status: new Date(dueDate) < new Date() ? 'overdue' : 'pending',
            })
            .eq('id', existingCharge.id);

          stats.updatedCharges++;
        }
      } else {
        // Criar nova cobrança
        const { error: chargeError } = await supabase
          .from('charges')
          .insert({
            unit_id: unit.id,
            administrator_id: administratorId,
            amount,
            due_date: dueDate,
            reference_month: referenceMonth,
            status: new Date(dueDate) < new Date() ? 'overdue' : 'pending',
            description: `Cobrança ref. ${referenceMonth} - Sincronização automática`,
          });

        if (chargeError) {
          errors.push({ record, error: chargeError.message });
          continue;
        }

        stats.newCharges++;
      }

    } catch (error) {
      errors.push({ record, error: error.message });
    }
  }

  console.log('✅ Processamento concluído');
  console.log(`📊 Stats:`, stats);

  return { stats, errors };
}

// Calcular próximo horário de sincronização
function calculateNextSyncTime(frequency: string, syncTime: string): string {
  const now = new Date();
  const [hours, minutes] = syncTime.split(':').map(Number);

  let nextSync = new Date(now);
  nextSync.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'hourly':
      nextSync.setHours(now.getHours() + 1);
      break;
    case 'daily':
      if (nextSync <= now) {
        nextSync.setDate(nextSync.getDate() + 1);
      }
      break;
    case 'weekly':
      if (nextSync <= now) {
        nextSync.setDate(nextSync.getDate() + 7);
      }
      break;
  }

  return nextSync.toISOString();
}
