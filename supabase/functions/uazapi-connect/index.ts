import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do servidor UAZAPI v2
const UAZAPI_SERVER_URL = Deno.env.get('UAZAPI_SERVER_URL') || "https://appnow.uazapi.com";
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_API_KEY') || "";

interface ConnectRequest {
  action: 'create' | 'connect' | 'status' | 'disconnect' | 'list' | 'sync' | 'setup-webhook';
  instanceName?: string;
  instanceId?: string;
  phone?: string;
  instanceToken?: string;
  adminFieldValue?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: ConnectRequest = await req.json();
    const { action, instanceName, instanceId, phone, instanceToken, adminFieldValue } = body;

    const serverUrl = UAZAPI_SERVER_URL;
    const serverAdminToken = UAZAPI_ADMIN_TOKEN;

    console.log(`[UAZAPI v2] Action: ${action}, instanceName: ${instanceName}`);

    switch (action) {
      case 'create': {
        if (!instanceName) {
          return jsonResponse({ error: 'Nome da instância é obrigatório' }, 400);
        }

        console.log(`[UAZAPI v2] POST /instance/init com admintoken`);

        // UAZAPI v2: POST /instance/init com header "admintoken"
        const createResponse = await fetch(`${serverUrl}/instance/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': serverAdminToken,
          },
          body: JSON.stringify({
            name: instanceName,
            systemName: 'condominio-ffp',
            adminField01: adminFieldValue || 'system',
          }),
        });

        const createData = await createResponse.json();
        console.log(`[UAZAPI v2] Resposta init:`, JSON.stringify(createData).substring(0, 500));

        if (!createResponse.ok) {
          return jsonResponse({ error: createData.error || 'Erro ao criar instância', details: createData }, createResponse.status);
        }

        // Extrair dados da resposta v2
        const instance = createData.instance || {};
        const token = createData.token || instance.token;
        const instanceIdCreated = instance.id || instance.name || instanceName;

        // Salvar no banco
        await supabase
          .from('uazapi_instances')
          .insert({
            instance_id: instanceIdCreated,
            name: instanceName,
            api_key: token,
            base_url: serverUrl,
            admin_field_01: adminFieldValue || 'system',
            status: 'disconnected',
          });

        return jsonResponse({
          success: true,
          instance,
          token,
          instanceId: instanceIdCreated,
          message: createData.response || 'Instância criada com sucesso',
        });
      }

      case 'connect': {
        if (!instanceToken) {
          return jsonResponse({ error: 'Token da instância é obrigatório' }, 400);
        }

        console.log(`[UAZAPI v2] POST /instance/connect com token`);

        // UAZAPI v2: POST /instance/connect com header "token"
        const connectBody: Record<string, string> = {};
        if (phone) {
          connectBody.phone = phone.replace(/\D/g, '');
        }

        const connectResponse = await fetch(`${serverUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(connectBody),
        });

        const connectData = await connectResponse.json();
        console.log(`[UAZAPI v2] Resposta connect:`, JSON.stringify(connectData).substring(0, 500));

        if (!connectResponse.ok) {
          return jsonResponse({ error: connectData.error || 'Erro ao conectar', details: connectData }, connectResponse.status);
        }

        const inst = connectData.instance || {};
        return jsonResponse({
          success: true,
          connected: connectData.connected,
          loggedIn: connectData.loggedIn,
          status: inst.status,
          qrcode: inst.qrcode,
          paircode: inst.paircode,
          instance: inst,
        });
      }

      case 'status': {
        if (!instanceToken) {
          return jsonResponse({ error: 'Token da instância é obrigatório' }, 400);
        }

        console.log(`[UAZAPI v2] GET /instance/status com token`);

        // UAZAPI v2: GET /instance/status com header "token"
        const statusResponse = await fetch(`${serverUrl}/instance/status`, {
          method: 'GET',
          headers: {
            'token': instanceToken,
          },
        });

        const statusData = await statusResponse.json();
        console.log(`[UAZAPI v2] Resposta status:`, JSON.stringify(statusData).substring(0, 500));

        if (!statusResponse.ok) {
          return jsonResponse({ error: statusData.error || 'Erro ao verificar status', details: statusData }, statusResponse.status);
        }

        const statusInstance = statusData.instance || {};
        const statusInfo = statusData.status || {};

        // Se conectado, atualizar no banco
        if (statusInfo.connected && statusInfo.loggedIn) {
          const phoneNumber = statusInfo.jid?.user || null;
          await supabase
            .from('uazapi_instances')
            .update({
              status: 'connected',
              phone_number: phoneNumber,
              updated_at: new Date().toISOString(),
            })
            .eq('api_key', instanceToken);
        }

        return jsonResponse({
          success: true,
          connected: statusInfo.connected,
          loggedIn: statusInfo.loggedIn,
          status: statusInstance.status,
          qrcode: statusInstance.qrcode,
          paircode: statusInstance.paircode,
          profileName: statusInstance.profileName,
          phone: statusInfo.jid?.user,
          instance: statusInstance,
        });
      }

      case 'setup-webhook': {
        if (!instanceToken) {
          return jsonResponse({ error: 'Token da instância é obrigatório' }, 400);
        }

        console.log(`[UAZAPI v2] POST /webhook - configurando webhook`);

        // Construir URL do webhook baseado na URL do Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;

        console.log(`[UAZAPI v2] Webhook URL: ${webhookUrl}`);

        // UAZAPI v2: POST /webhook com header "token" (modo simples)
        const webhookResponse = await fetch(`${serverUrl}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: [
              'messages',
              'messages_update',
              'connection',
            ],
            excludeMessages: ['wasSentByApi'], // Evita loops
          }),
        });

        const webhookData = await webhookResponse.json();
        console.log(`[UAZAPI v2] Resposta webhook:`, JSON.stringify(webhookData).substring(0, 500));

        if (!webhookResponse.ok) {
          return jsonResponse({ error: webhookData.error || 'Erro ao configurar webhook', details: webhookData }, webhookResponse.status);
        }

        return jsonResponse({
          success: true,
          message: 'Webhook configurado com sucesso',
          webhookUrl,
          data: webhookData,
        });
      }

      case 'disconnect': {
        if (!instanceToken) {
          return jsonResponse({ error: 'Token da instância é obrigatório' }, 400);
        }

        console.log(`[UAZAPI v2] POST /instance/disconnect com token`);

        const disconnectResponse = await fetch(`${serverUrl}/instance/disconnect`, {
          method: 'POST',
          headers: {
            'token': instanceToken,
          },
        });

        const disconnectData = await disconnectResponse.json();

        // Atualizar status no banco
        await supabase
          .from('uazapi_instances')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('api_key', instanceToken);

        return jsonResponse({
          success: true,
          message: disconnectData.response || 'Desconectado',
          instance: disconnectData.instance,
        });
      }

      case 'list': {
        console.log(`[UAZAPI v2] GET /instance/all com admintoken`);

        const listResponse = await fetch(`${serverUrl}/instance/all`, {
          method: 'GET',
          headers: {
            'admintoken': serverAdminToken,
          },
        });

        const listData = await listResponse.json();

        if (!listResponse.ok) {
          return jsonResponse({ error: listData.error || 'Erro ao listar', details: listData }, listResponse.status);
        }

        return jsonResponse({
          success: true,
          instances: Array.isArray(listData) ? listData : [],
        });
      }

      case 'sync': {
        console.log(`[UAZAPI v2] Sincronizando instâncias`);

        if (!adminFieldValue) {
          return jsonResponse({ error: 'adminFieldValue é obrigatório para sincronização' }, 400);
        }

        const listResponse = await fetch(`${serverUrl}/instance/all`, {
          method: 'GET',
          headers: {
            'admintoken': serverAdminToken,
          },
        });

        const serverInstances = await listResponse.json();
        console.log(`[UAZAPI v2] Instâncias do servidor:`, JSON.stringify(serverInstances).substring(0, 500));

        const syncedInstances = [];
        for (const inst of serverInstances || []) {
          const { data, error } = await supabase
            .from('uazapi_instances')
            .upsert({
              instance_id: inst.id || inst.name,
              name: inst.name,
              api_key: inst.token,
              base_url: serverUrl,
              admin_field_01: adminFieldValue,
              status: inst.status === 'connected' ? 'connected' : 'disconnected',
              phone_number: inst.status === 'connected' ? (inst.owner || null) : null,
            }, { onConflict: 'instance_id' })
            .select();

          if (data) syncedInstances.push(data[0]);
          if (error) console.error('[UAZAPI v2] Erro ao sincronizar:', error);
        }

        return jsonResponse({
          success: true,
          synced: syncedInstances.length,
          instances: syncedInstances,
        });
      }

      default:
        return jsonResponse({ error: 'Ação inválida' }, 400);
    }
  } catch (error) {
    console.error('[UAZAPI v2] Erro:', error);
    return jsonResponse({ error: error.message || 'Erro interno' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
