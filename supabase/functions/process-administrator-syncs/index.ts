import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏰ Processando sincronizações agendadas...');

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // Buscar todas as configurações de sincronização que precisam ser executadas
    const { data: syncConfigs, error: configError } = await supabase
      .from('administrator_sync_config')
      .select(`
        *,
        administrators (
          id,
          name,
          active
        )
      `)
      .eq('auto_sync_enabled', true)
      .eq('active', true)
      .lte('next_sync_at', now.toISOString());

    if (configError) {
      throw configError;
    }

    if (!syncConfigs || syncConfigs.length === 0) {
      console.log('ℹ️ Nenhuma sincronização agendada para executar');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma sincronização agendada',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 ${syncConfigs.length} sincronizações encontradas`);

    const results = [];

    // Processar cada sincronização
    for (const config of syncConfigs) {
      try {
        // Verificar se a administradora está ativa
        if (!config.administrators?.active) {
          console.log(`⏭️ Pulando administradora inativa: ${config.administrators?.name}`);
          continue;
        }

        console.log(`🔄 Sincronizando: ${config.administrators?.name}`);

        // Invocar função de sincronização
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          'sync-administrator-data',
          {
            body: {
              administratorId: config.administrator_id,
              syncType: 'scheduled',
            },
          }
        );

        if (syncError) {
          console.error(`❌ Erro ao sincronizar ${config.administrators?.name}:`, syncError);

          // Notificar erros se configurado
          if (config.notify_on_error && config.notification_emails?.length > 0) {
            await sendErrorNotification(
              supabase,
              config.administrators?.name,
              syncError.message,
              config.notification_emails
            );
          }

          results.push({
            administrator: config.administrators?.name,
            success: false,
            error: syncError.message,
          });
        } else {
          console.log(`✅ Sincronização concluída: ${config.administrators?.name}`);

          // Notificar sucesso se configurado
          if (config.notify_on_success && config.notification_emails?.length > 0) {
            await sendSuccessNotification(
              supabase,
              config.administrators?.name,
              syncResult,
              config.notification_emails
            );
          }

          results.push({
            administrator: config.administrators?.name,
            success: true,
            stats: syncResult?.stats,
          });
        }

      } catch (error) {
        console.error(`❌ Erro ao processar ${config.administrators?.name}:`, error);
        results.push({
          administrator: config.administrators?.name,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ Processamento concluído: ${successCount} sucessos, ${failureCount} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Enviar notificação de erro
async function sendErrorNotification(
  supabase: any,
  administratorName: string,
  errorMessage: string,
  emails: string[]
) {
  try {
    await supabase.functions.invoke('send-workflow-email', {
      body: {
        to: emails,
        subject: `⚠️ Erro na sincronização - ${administratorName}`,
        html: `
          <h2>Erro na Sincronização</h2>
          <p><strong>Administradora:</strong> ${administratorName}</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p><strong>Erro:</strong></p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${errorMessage}</pre>
          <p>Por favor, verifique as configurações de sincronização e credenciais do portal.</p>
        `,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}

// Enviar notificação de sucesso
async function sendSuccessNotification(
  supabase: any,
  administratorName: string,
  syncResult: any,
  emails: string[]
) {
  try {
    const stats = syncResult?.stats || {};

    await supabase.functions.invoke('send-workflow-email', {
      body: {
        to: emails,
        subject: `✅ Sincronização concluída - ${administratorName}`,
        html: `
          <h2>Sincronização Concluída</h2>
          <p><strong>Administradora:</strong> ${administratorName}</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>

          <h3>Estatísticas:</h3>
          <ul>
            <li>Novos condomínios: ${stats.newCondominiums || 0}</li>
            <li>Condomínios atualizados: ${stats.updatedCondominiums || 0}</li>
            <li>Novas unidades: ${stats.newUnits || 0}</li>
            <li>Unidades atualizadas: ${stats.updatedUnits || 0}</li>
            <li>Novas cobranças: ${stats.newCharges || 0}</li>
            <li>Cobranças atualizadas: ${stats.updatedCharges || 0}</li>
          </ul>

          ${syncResult?.errors?.length > 0 ? `
            <h3>⚠️ Avisos:</h3>
            <p>${syncResult.errors.length} registro(s) com erro</p>
          ` : ''}
        `,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}
