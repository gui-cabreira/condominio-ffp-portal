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

    const { executionId } = await req.json()

    console.log('Processing workflow execution:', executionId)

    // Buscar execução
    const { data: execution, error: execError } = await supabaseClient
      .from('workflow_executions')
      .select('*, workflows(*)')
      .eq('id', executionId)
      .single()

    if (execError) throw execError

    // Buscar nós do workflow
    const { data: nodes, error: nodesError } = await supabaseClient
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', execution.workflow_id)
      .order('created_at')

    if (nodesError) throw nodesError

    // Buscar conexões
    const { data: edges, error: edgesError } = await supabaseClient
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', execution.workflow_id)

    if (edgesError) throw edgesError

    // Buscar loops
    const { data: loops, error: loopsError } = await supabaseClient
      .from('workflow_loops')
      .select('*')
      .eq('workflow_id', execution.workflow_id)

    if (loopsError) throw loopsError

    // Encontrar nó inicial
    const startNode = nodes.find(n => n.node_type === 'start')
    if (!startNode) {
      throw new Error('Start node not found')
    }

    // Atualizar status da execução
    await supabaseClient
      .from('workflow_executions')
      .update({ status: 'running', current_node_id: startNode.node_id })
      .eq('id', executionId)

    // Processar workflow em ordem
    let currentNodeId = startNode.node_id
    let processedNodes = new Set<string>()
    let currentTime = new Date()

    while (currentNodeId && processedNodes.size < nodes.length) {
      const currentNode = nodes.find(n => n.node_id === currentNodeId)
      if (!currentNode || processedNodes.has(currentNodeId)) break

      processedNodes.add(currentNodeId)

      console.log('Processing node:', currentNode.node_type, currentNode.node_id)

      // Calcular tempo de execução baseado no tipo
      let scheduledFor = new Date(currentTime)
      
      if (currentNode.node_type === 'delay') {
        const delayDays = (currentNode.config as any)?.delay || 1
        scheduledFor = new Date(currentTime.getTime() + delayDays * 24 * 60 * 60 * 1000)
      }

      // Criar passo de execução
      const { error: stepError } = await supabaseClient
        .from('workflow_execution_steps')
        .insert({
          execution_id: executionId,
          node_id: currentNode.node_id,
          node_type: currentNode.node_type,
          status: currentNode.node_type === 'delay' ? 'pending' : 'completed',
          scheduled_for: scheduledFor.toISOString(),
          started_at: currentTime.toISOString(),
          completed_at: currentNode.node_type === 'delay' ? null : currentTime.toISOString(),
          result: currentNode.config
        })

      if (stepError) throw stepError

      // Verificar se é um loop
      const loopConfig = loops?.find(l => l.node_id === currentNode.node_id)
      if (loopConfig) {
        console.log('Loop node detected:', loopConfig.condition_type, loopConfig.max_iterations)
        
        // Verificar condição do loop
        if (loopConfig.condition_type === 'count') {
          const currentIteration = loopConfig.current_iteration || 0
          if (currentIteration < loopConfig.max_iterations) {
            // Incrementar iteração
            await supabaseClient
              .from('workflow_loops')
              .update({ current_iteration: currentIteration + 1 })
              .eq('id', loopConfig.id)

            // Voltar para o início do loop (primeiro nó após o start)
            const firstEdge = edges.find(e => e.source_node_id === startNode.node_id)
            if (firstEdge) {
              currentNodeId = firstEdge.target_node_id
              currentTime = scheduledFor
              continue
            }
          }
        }
      }

      // Encontrar próximo nó
      const nextEdge = edges.find(e => e.source_node_id === currentNodeId)
      if (nextEdge) {
        currentNodeId = nextEdge.target_node_id
        currentTime = scheduledFor
      } else {
        currentNodeId = null
      }
    }

    // Marcar execução como completa
    await supabaseClient
      .from('workflow_executions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)

    console.log('Workflow execution completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        executionId,
        stepsProcessed: processedNodes.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error executing workflow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})