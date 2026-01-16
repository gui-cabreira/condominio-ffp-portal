import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do servidor UAZAPI - usa secrets configurados
const UAZAPI_SERVER_URL = Deno.env.get('UAZAPI_SERVER_URL') || "https://appnow.uazapi.com";
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_API_KEY') || "";

interface ConnectRequest {
  action: 'create' | 'connect' | 'status' | 'disconnect' | 'list' | 'sync';
  instanceName?: string;
  instanceId?: string;
  phone?: string;
  instanceToken?: string;
  adminFieldValue?: string; // Valor para admin_field_01 (identifica quem pode ver)
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

    console.log(`[UAZAPI] Action: ${action}, instanceName: ${instanceName}, instanceId: ${instanceId}`);

    // Sempre usar servidor intrínseco - não aceitar do usuário
    const serverUrl = UAZAPI_SERVER_URL;
    const serverAdminToken = UAZAPI_ADMIN_TOKEN;

    switch (action) {
      case 'create': {
        // Criar nova instância via admin token
        if (!instanceName) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[UAZAPI] Criando instância: ${instanceName} em ${serverUrl}`);

        const createResponse = await fetch(`${serverUrl}/instance/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': serverAdminToken,
          },
          body: JSON.stringify({
            name: instanceName,
            systemName: 'condominio-ffp',
          }),
        });

        const createData = await createResponse.json();
        console.log(`[UAZAPI] Resposta criação:`, JSON.stringify(createData));

        if (!createResponse.ok) {
          return new Response(
            JSON.stringify({ error: createData.error || 'Erro ao criar instância', details: createData }),
            { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Salvar no banco com admin_field_01 se fornecido
        const instance = createData.instance || {};
        const token = createData.token || instance.token;
        
        if (adminFieldValue) {
          await supabase
            .from('uazapi_instances')
            .insert({
              instance_id: instance.id || instance.name || instanceName,
              name: instanceName,
              api_key: token,
              base_url: serverUrl,
              admin_field_01: adminFieldValue,
              status: 'disconnected',
            });
        }

        return new Response(
          JSON.stringify({
            success: true,
            instance: instance,
            token: token,
            message: createData.response || 'Instância criada com sucesso',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'connect': {
        // Conectar instância existente (gera QR code ou paircode)
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Token da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[UAZAPI] Conectando instância em ${serverUrl}, phone: ${phone || 'QR'}`);

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
        console.log(`[UAZAPI] Resposta conexão:`, JSON.stringify(connectData).substring(0, 500));

        if (!connectResponse.ok) {
          return new Response(
            JSON.stringify({ error: connectData.error || 'Erro ao conectar', details: connectData }),
            { status: connectResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const instance = connectData.instance || {};
        return new Response(
          JSON.stringify({
            success: true,
            connected: connectData.connected,
            status: instance.status,
            qrcode: instance.qrcode,
            paircode: instance.paircode,
            instance,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Token da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[UAZAPI] Verificando status em ${serverUrl}`);

        const statusResponse = await fetch(`${serverUrl}/instance/status`, {
          method: 'GET',
          headers: {
            'token': instanceToken,
          },
        });

        const statusData = await statusResponse.json();
        console.log(`[UAZAPI] Resposta status:`, JSON.stringify(statusData).substring(0, 500));

        if (!statusResponse.ok) {
          return new Response(
            JSON.stringify({ error: statusData.error || 'Erro ao verificar status', details: statusData }),
            { status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const instance = statusData.instance || {};
        const status = statusData.status || {};

        return new Response(
          JSON.stringify({
            success: true,
            connected: status.connected,
            loggedIn: status.loggedIn,
            status: instance.status,
            qrcode: instance.qrcode,
            paircode: instance.paircode,
            profileName: instance.profileName,
            phone: status.jid?.user,
            instance,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Token da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[UAZAPI] Desconectando instância`);

        const disconnectResponse = await fetch(`${serverUrl}/instance/disconnect`, {
          method: 'POST',
          headers: {
            'token': instanceToken,
          },
        });

        const disconnectData = await disconnectResponse.json();

        return new Response(
          JSON.stringify({
            success: true,
            message: disconnectData.response || 'Desconectado',
            instance: disconnectData.instance,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        // Listar todas as instâncias do servidor (admin interno apenas)
        console.log(`[UAZAPI] Listando instâncias do servidor`);

        const listResponse = await fetch(`${serverUrl}/instance/all`, {
          method: 'GET',
          headers: {
            'admintoken': serverAdminToken,
          },
        });

        const listData = await listResponse.json();

        if (!listResponse.ok) {
          return new Response(
            JSON.stringify({ error: listData.error || 'Erro ao listar', details: listData }),
            { status: listResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            instances: Array.isArray(listData) ? listData : [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync': {
        // Sincronizar instâncias do servidor para o banco
        console.log(`[UAZAPI] Sincronizando instâncias`);

        if (!adminFieldValue) {
          return new Response(
            JSON.stringify({ error: 'adminFieldValue é obrigatório para sincronização' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const listResponse = await fetch(`${serverUrl}/instance/all`, {
          method: 'GET',
          headers: {
            'admintoken': serverAdminToken,
          },
        });

        const serverInstances = await listResponse.json();
        console.log(`[UAZAPI] Instâncias do servidor:`, JSON.stringify(serverInstances).substring(0, 500));

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
              status: inst.status === 'CONNECTED' ? 'connected' : 'disconnected',
            }, { onConflict: 'instance_id' })
            .select();
          
          if (data) syncedInstances.push(data[0]);
          if (error) console.error('[UAZAPI] Erro ao sincronizar:', error);
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced: syncedInstances.length,
            instances: syncedInstances,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[UAZAPI] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
