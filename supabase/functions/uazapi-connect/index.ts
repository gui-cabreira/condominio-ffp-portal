import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  action: 'create' | 'connect' | 'status' | 'disconnect' | 'list';
  instanceName?: string;
  instanceId?: string;
  phone?: string; // Para gerar paircode ao invés de QR
  baseUrl?: string;
  adminToken?: string;
  instanceToken?: string;
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
    const { action, instanceName, instanceId, phone, baseUrl, adminToken, instanceToken } = body;

    console.log(`[UAZAPI] Action: ${action}, instanceName: ${instanceName}, instanceId: ${instanceId}`);

    // Buscar configurações globais se não fornecidas
    let serverUrl = baseUrl;
    let serverAdminToken = adminToken;

    if (!serverUrl || !serverAdminToken) {
      const { data: params } = await supabase
        .from('negotiation_parameters')
        .select('parameter_key, parameter_value')
        .in('parameter_key', ['whatsapp_server_url', 'whatsapp_admin_token']);

      if (params) {
        for (const p of params) {
          if (p.parameter_key === 'whatsapp_server_url') serverUrl = p.parameter_value;
          if (p.parameter_key === 'whatsapp_admin_token') serverAdminToken = p.parameter_value;
        }
      }
    }

    if (!serverUrl) {
      return new Response(
        JSON.stringify({ error: 'URL do servidor WhatsApp não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Garantir que a URL não termina com /
    serverUrl = serverUrl.replace(/\/$/, '');

    switch (action) {
      case 'create': {
        // Criar nova instância via admin token
        if (!serverAdminToken) {
          return new Response(
            JSON.stringify({ error: 'Admin token não configurado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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

        // Retornar dados da instância criada
        return new Response(
          JSON.stringify({
            success: true,
            instance: createData.instance,
            token: createData.token || createData.instance?.token,
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
          // Se passar phone, gera código de pareamento (8 dígitos)
          connectBody.phone = phone.replace(/\D/g, '');
        }
        // Se não passar phone, gera QR code

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

        // Extrair QR code ou paircode
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
        // Verificar status da instância
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
        // Desconectar instância
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
        // Listar todas as instâncias (admin)
        if (!serverAdminToken) {
          return new Response(
            JSON.stringify({ error: 'Admin token não configurado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[UAZAPI] Listando instâncias`);

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
