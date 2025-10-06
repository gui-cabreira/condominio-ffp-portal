import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Node, Edge } from '@xyflow/react';

export const useWorkflow = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const saveWorkflow = useCallback(async (
    name: string,
    description: string,
    nodes: Node[],
    edges: Edge[],
    workflowId?: string
  ) => {
    try {
      setLoading(true);

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let finalWorkflowId = workflowId;

      // Criar ou atualizar workflow
      if (workflowId) {
        console.log('Atualizando workflow:', workflowId);
        const { error: updateError } = await supabase
          .from('workflows')
          .update({ name, description, updated_at: new Date().toISOString() })
          .eq('id', workflowId);

        if (updateError) {
          console.error('Erro ao atualizar workflow:', updateError);
          throw updateError;
        }
      } else {
        console.log('Criando novo workflow');
        const { data: workflow, error: createError } = await supabase
          .from('workflows')
          .insert([{ 
            name, 
            description,
            created_by: user.id,
            is_active: true
          }])
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar workflow:', createError);
          throw createError;
        }
        finalWorkflowId = workflow.id;
        console.log('Workflow criado:', finalWorkflowId);
      }

      // Deletar nós e edges antigos
      if (workflowId) {
        console.log('Deletando nós e edges antigos');
        await supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId);
        await supabase.from('workflow_edges').delete().eq('workflow_id', workflowId);
        await supabase.from('workflow_loops').delete().eq('workflow_id', workflowId);
      }

      // Salvar nós
      console.log('Salvando', nodes.length, 'nós');
      const nodesToInsert = nodes.map(node => ({
        workflow_id: finalWorkflowId!,
        node_id: node.id,
        node_type: node.type || 'default',
        position_x: node.position.x,
        position_y: node.position.y,
        config: (node.data || {}) as any
      }));

      if (nodesToInsert.length > 0) {
        const { error: nodesError } = await supabase
          .from('workflow_nodes')
          .insert(nodesToInsert);

        if (nodesError) {
          console.error('Erro ao salvar nós:', nodesError);
          throw nodesError;
        }
      }

      // Salvar edges
      console.log('Salvando', edges.length, 'edges');
      const edgesToInsert = edges.map(edge => ({
        workflow_id: finalWorkflowId,
        source_node_id: edge.source,
        target_node_id: edge.target,
        edge_type: edge.type || 'default'
      }));

      if (edgesToInsert.length > 0) {
        const { error: edgesError } = await supabase
          .from('workflow_edges')
          .insert(edgesToInsert);

        if (edgesError) {
          console.error('Erro ao salvar edges:', edgesError);
          throw edgesError;
        }
      }

      // Salvar loops
      const loopNodes = nodes.filter(node => node.type === 'loop');
      console.log('Salvando', loopNodes.length, 'loops');
      if (loopNodes.length > 0) {
        const loopsToInsert = loopNodes.map(node => ({
          workflow_id: finalWorkflowId!,
          node_id: node.id,
          max_iterations: (node.data?.maxIterations as number) || 3,
          condition_type: (node.data?.conditionType as string) || 'count'
        }));

        const { error: loopsError } = await supabase
          .from('workflow_loops')
          .insert(loopsToInsert);

        if (loopsError) {
          console.error('Erro ao salvar loops:', loopsError);
          throw loopsError;
        }
      }

      console.log('Workflow salvo com sucesso!');
      toast({
        title: 'Sucesso',
        description: 'Workflow salvo com sucesso!'
      });

      return finalWorkflowId;
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Erro ao salvar workflow. Verifique o console para mais detalhes.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadWorkflow = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);

      // Carregar workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Carregar nós
      const { data: nodes, error: nodesError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId);

      if (nodesError) throw nodesError;

      // Carregar edges
      const { data: edges, error: edgesError } = await supabase
        .from('workflow_edges')
        .select('*')
        .eq('workflow_id', workflowId);

      if (edgesError) throw edgesError;

      // Carregar loops
      const { data: loops, error: loopsError } = await supabase
        .from('workflow_loops')
        .select('*')
        .eq('workflow_id', workflowId);

      if (loopsError) throw loopsError;

      // Converter para formato do React Flow
      const flowNodes: Node[] = nodes.map(node => {
        const loopData = loops?.find(l => l.node_id === node.node_id);
        const baseData = (node.config as Record<string, unknown>) || {};
        
        return {
          id: node.node_id,
          type: node.node_type,
          position: { x: Number(node.position_x), y: Number(node.position_y) },
          data: loopData ? {
            ...baseData,
            maxIterations: loopData.max_iterations,
            conditionType: loopData.condition_type
          } : baseData
        };
      });

      const flowEdges: Edge[] = edges.map(edge => ({
        id: `${edge.source_node_id}-${edge.target_node_id}`,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: edge.edge_type
      }));

      return {
        workflow,
        nodes: flowNodes,
        edges: flowEdges
      };
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar workflow',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const listWorkflows = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing workflows:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lista de workflows',
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  const executeWorkflow = useCallback(async (workflowId: string, chargeId: string) => {
    try {
      setLoading(true);

      // Criar execução
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert([{
          workflow_id: workflowId,
          charge_id: chargeId,
          status: 'pending',
          started_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (executionError) throw executionError;

      toast({
        title: 'Sucesso',
        description: 'Workflow iniciado com sucesso!'
      });

      return execution;
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao executar workflow',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    saveWorkflow,
    loadWorkflow,
    listWorkflows,
    executeWorkflow,
    loading
  };
};