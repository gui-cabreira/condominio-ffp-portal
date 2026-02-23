import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMessageTemplatesByType } from '@/hooks/useMessageTemplates';
import { ArrowLeft, Plus, Save, Play, MessageCircle, Mail, FileText, Clock, Settings2, Wand2, Copy, Download, Upload, RotateCw, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeMouseHandler,
  OnNodesDelete,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LoopNode } from '@/components/workflow/LoopNode';
import { useWorkflow } from '@/hooks/useWorkflow';

// Tipos de nós personalizados
const MessageNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'sms':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const truncateMessage = (msg: string, maxLength: number = 50) => {
    if (!msg) return 'Clique para configurar a mensagem...';
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="bg-white border-2 border-gray-200 rounded-lg p-4 min-w-[250px] shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-400"
      onClick={() => data.onEdit && data.onEdit(data.nodeId)}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
      
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-semibold text-sm capitalize">{data.type}</span>
        {data.delay > 0 && (
          <span className="text-xs text-gray-500">+{data.delay} dias</span>
        )}
      </div>
      
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
        {truncateMessage(data.message)}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
};

const DelayNode = ({ data }: { data: any }) => {
  const [delay, setDelay] = useState(data.delay || 1);

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 min-w-[180px] shadow-md hover:shadow-lg transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-sm">Aguardar</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={delay}
          onChange={(e) => {
            const newDelay = parseInt(e.target.value) || 1;
            setDelay(newDelay);
            data.delay = newDelay;
          }}
          className="w-16 text-center"
          min="1"
        />
        <span className="text-sm text-gray-600">dias</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
};

const StartNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-full p-4 min-w-[120px] shadow-md text-center hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-center gap-2">
        <Play className="w-4 h-4 text-green-600" />
        <span className="font-semibold text-sm">Início</span>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
};

const WorkflowConfig = () => {
  const { toast } = useToast();
  
  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = React.useMemo(() => ({
    message: MessageNode,
    delay: DelayNode,
    start: StartNode,
    loop: LoopNode,
  }), []);
  const [workflowName, setWorkflowName] = useState('Workflow Padrão');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('flow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>();
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingDelay, setEditingDelay] = useState(0);
  const { saveWorkflow, loadWorkflow, loading } = useWorkflow();

  // Estados do React Flow
  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Início' },
    },
  ];

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      toast({
        title: 'Conexão criada',
        description: 'Nós conectados com sucesso'
      });
    },
    [setEdges, toast]
  );

  const openMessageDialog = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node) {
        setEditingNode(node);
        setEditingMessage(String(node.data.message || ''));
        setEditingDelay(typeof node.data.delay === 'number' ? node.data.delay : 0);
        setMessageDialogOpen(true);
      }
      return currentNodes; // Não modifica nodes, apenas lê
    });
  }, []);

  const saveMessageEdit = () => {
    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  message: editingMessage,
                  delay: editingDelay,
                },
              }
            : node
        )
      );
      setMessageDialogOpen(false);
      toast({
        title: 'Mensagem atualizada',
        description: 'As alterações foram salvas'
      });
    }
  };

  const addNode = (type: string, nodeType: string) => {
    const newNodeId = `${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: nodeType,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 200 },
      data: { 
        nodeId: newNodeId,
        type,
        message: '',
        delay: nodeType === 'delay' ? 1 : 0,
        onEdit: openMessageDialog
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast({
      title: 'Nó adicionado',
      description: `Nó do tipo ${type} adicionado ao workflow`
    });
  };

  // Update existing nodes with onEdit callback when nodes change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          nodeId: node.id,
          onEdit: openMessageDialog,
        },
      }))
    );
  }, [openMessageDialog]);

  const applyTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    
    let newNodes: Node[] = [
      {
        id: '1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Início' },
      }
    ];
    
    let newEdges: Edge[] = [];
    
    if (templateName === 'Cobrança Amigável') {
      newNodes = [
        ...newNodes,
        { id: '2', type: 'message', position: { x: 250, y: 150 }, data: { type: 'whatsapp', message: 'Lembrete amigável de cobrança' } },
        { id: '3', type: 'delay', position: { x: 250, y: 280 }, data: { delay: 3 } },
        { id: '4', type: 'message', position: { x: 250, y: 400 }, data: { type: 'email', message: 'E-mail de segunda cobrança' } },
        { id: '5', type: 'delay', position: { x: 250, y: 530 }, data: { delay: 7 } },
        { id: '6', type: 'message', position: { x: 250, y: 650 }, data: { type: 'sms', message: 'SMS final de cobrança' } },
      ];
      newEdges = [
        { id: 'e1-2', source: '1', target: '2', animated: true },
        { id: 'e2-3', source: '2', target: '3', animated: true },
        { id: 'e3-4', source: '3', target: '4', animated: true },
        { id: 'e4-5', source: '4', target: '5', animated: true },
        { id: 'e5-6', source: '5', target: '6', animated: true },
      ];
    } else if (templateName === 'Cobrança Intensiva') {
      newNodes = [
        ...newNodes,
        { id: '2', type: 'message', position: { x: 150, y: 150 }, data: { type: 'whatsapp', message: 'WhatsApp urgente' } },
        { id: '3', type: 'message', position: { x: 350, y: 150 }, data: { type: 'email', message: 'E-mail simultâneo' } },
        { id: '4', type: 'delay', position: { x: 250, y: 280 }, data: { delay: 2 } },
        { id: '5', type: 'message', position: { x: 250, y: 400 }, data: { type: 'whatsapp', message: 'Segundo WhatsApp' } },
        { id: '6', type: 'delay', position: { x: 250, y: 530 }, data: { delay: 5 } },
        { id: '7', type: 'message', position: { x: 250, y: 650 }, data: { type: 'sms', message: 'SMS final urgente' } },
      ];
      newEdges = [
        { id: 'e1-2', source: '1', target: '2', animated: true },
        { id: 'e1-3', source: '1', target: '3', animated: true },
        { id: 'e2-4', source: '2', target: '4', animated: true },
        { id: 'e3-4', source: '3', target: '4', animated: true },
        { id: 'e4-5', source: '4', target: '5', animated: true },
        { id: 'e5-6', source: '5', target: '6', animated: true },
        { id: 'e6-7', source: '6', target: '7', animated: true },
      ];
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
    toast({
      title: 'Template aplicado',
      description: `Template "${templateName}" carregado com sucesso!`
    });
  };

  const handleSaveWorkflow = async () => {
    try {
      const workflowId = await saveWorkflow(
        workflowName,
        selectedTemplate || 'Workflow personalizado',
        nodes,
        edges,
        currentWorkflowId
      );
      setCurrentWorkflowId(workflowId);
      toast({
        title: 'Workflow salvo!',
        description: 'Todas as configurações foram salvas com sucesso'
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const onNodesDelete: OnNodesDelete = useCallback((deleted) => {
    deleted.forEach(node => {
      toast({
        title: 'Nó removido',
        description: `Nó ${node.type} foi excluído`,
        variant: 'destructive'
      });
    });
  }, [toast]);

  const templates = [
    {
      name: 'Cobrança Amigável',
      description: 'WhatsApp → Aguardar 3 dias → E-mail → Aguardar 7 dias → SMS',
    },
    {
      name: 'Cobrança Intensiva',
      description: 'WhatsApp → E-mail (mesmo dia) → Aguardar 2 dias → WhatsApp → Aguardar 5 dias → SMS',
    },
    {
      name: 'Cobrança Personalizada',
      description: 'Configure seu próprio fluxo',
    },
  ];

  // Use DB templates
  const { grouped: messageTemplates } = useMessageTemplatesByType();

  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    toast({
      title: isFullscreen ? 'Modo normal' : 'Modo tela cheia',
      description: isFullscreen ? 'Voltando ao modo normal' : 'Área de trabalho expandida'
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className={`${isFullscreen ? 'max-w-full' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {!isFullscreen && (
                <Link to="/portal/corporativo/dashboard" className="mr-4">
                  <ArrowLeft className="w-5 h-5 text-ffp-navy hover:text-ffp-gold" />
                </Link>
              )}
              <h1 className="text-xl font-semibold text-ffp-navy">
                {isFullscreen ? `${workflowName} - Modo Tela Cheia` : 'Configuração de Workflow'}
              </h1>
            </div>
            <div className="flex gap-2">
              {!isFullscreen && (
                <>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                  <Button variant="outline">Pré-visualizar</Button>
                </>
              )}
              <Button 
                className="bg-ffp-navy hover:bg-ffp-navy-dark text-white"
                onClick={handleSaveWorkflow}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Workflow'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dialog para editar mensagem */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              {editingNode?.data.type === 'whatsapp' && <MessageCircle className="w-5 h-5 text-green-600" />}
              {editingNode?.data.type === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
              {editingNode?.data.type === 'sms' && <FileText className="w-5 h-5 text-purple-600" />}
              Configurar Mensagem - {editingNode?.data.type?.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Configure o conteúdo da mensagem e o tempo de espera antes do envio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label htmlFor="delay">Aguardar antes de enviar (dias)</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                value={editingDelay}
                onChange={(e) => setEditingDelay(parseInt(e.target.value) || 0)}
                placeholder="Ex: 3"
              />
              <p className="text-xs text-muted-foreground">
                Dias para aguardar após a etapa anterior antes de enviar esta mensagem
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Conteúdo da Mensagem</Label>
              <Textarea
                id="message"
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                placeholder="Digite o conteúdo da mensagem..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Você pode usar variáveis: {'{nome}'}, {'{valor}'}, {'{data_vencimento}'}, {'{link}'}
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Templates Disponíveis</Label>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                {messageTemplates[editingNode?.data.type as keyof typeof messageTemplates]?.map((template, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="justify-start text-left h-auto py-2"
                    onClick={() => setEditingMessage(template.content)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-sm">{template.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {template.content.substring(0, 80)}...
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMessageEdit}>
              Salvar Mensagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`${isFullscreen ? 'h-[calc(100vh-4rem)]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 ${isFullscreen ? 'py-0' : 'py-8'}`}>
        {isFullscreen ? (
          /* Modo Tela Cheia - Canvas + Barra Lateral */
          <div className="grid grid-cols-5 gap-4 h-full">
            {/* Barra Lateral de Componentes */}
            <div className="col-span-1 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Adicionar Elementos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode('whatsapp', 'message')}
                    size="sm"
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                    WhatsApp
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode('email', 'message')}
                    size="sm"
                  >
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    E-mail
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode('sms', 'message')}
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2 text-purple-600" />
                    SMS
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode('delay', 'delay')}
                    size="sm"
                  >
                    <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                    Aguardar
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addNode('loop', 'loop')}
                    size="sm"
                  >
                    <RotateCw className="w-4 h-4 mr-2 text-purple-600" />
                    Loop
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Canvas */}
            <Card className="col-span-4 h-full">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-ffp-navy">Designer de Workflow</CardTitle>
                    <CardDescription>
                      Arraste os nós para posicionar. <strong>Clique e arraste dos círculos</strong> azuis para conectar os nós.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAdvancedSettingsOpen(true)}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-5rem)]">
                <div className="h-full border rounded-lg overflow-hidden">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodesDelete={onNodesDelete}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-gray-50"
                    deleteKeyCode="Delete"
                  >
                    <Controls />
                    <MiniMap />
                    <Background gap={12} size={1} />
                  </ReactFlow>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flow">Designer Visual</TabsTrigger>
            <TabsTrigger value="templates">Templates de Mensagem</TabsTrigger>
            <TabsTrigger value="automation">Automação</TabsTrigger>
          </TabsList>

          <TabsContent value="flow">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Painel Lateral */}
              <div className="lg:col-span-1 space-y-6">
                {/* Configurações Gerais */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-ffp-navy text-sm">Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="workflow-name">Nome do Workflow</Label>
                      <Input
                        id="workflow-name"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        placeholder="Nome do workflow..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="template">Template Inicial</Label>
                      <Select value={selectedTemplate} onValueChange={applyTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolher template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template, index) => (
                            <SelectItem key={index} value={template.name}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aplicar um template substitui o workflow atual
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Elementos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-ffp-navy text-sm">Adicionar Elementos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addNode('whatsapp', 'message')}
                    >
                      <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                      WhatsApp
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addNode('email', 'message')}
                    >
                      <Mail className="w-4 h-4 mr-2 text-blue-600" />
                      E-mail
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addNode('sms', 'message')}
                    >
                      <FileText className="w-4 h-4 mr-2 text-purple-600" />
                      SMS
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addNode('delay', 'delay')}
                    >
                      <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                      Aguardar
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addNode('loop', 'loop')}
                    >
                      <RotateCw className="w-4 h-4 mr-2 text-purple-600" />
                      Loop / Repetição
                    </Button>
                  </CardContent>
                </Card>

                {/* Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-ffp-navy text-sm">Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {templates.map((template, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Área do Flow */}
              <div className="lg:col-span-3">
                <Card className="h-[600px]">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-ffp-navy">Designer de Workflow</CardTitle>
                        <CardDescription>
                          Arraste os nós para posicionar. <strong>Clique e arraste dos círculos</strong> azuis para conectar os nós. <strong>Clique com botão direito</strong> para excluir.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                          <Maximize2 className="w-4 h-4 mr-2" />
                          Tela Cheia
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAdvancedSettingsOpen(true)}>
                          <Settings2 className="w-4 h-4 mr-2" />
                          Configurações Avançadas
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <div className="h-[500px] border rounded-lg overflow-hidden">
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodesDelete={onNodesDelete}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-gray-50"
                        deleteKeyCode="Delete"
                      >
                        <Controls />
                        <MiniMap />
                        <Background gap={12} size={1} />
                      </ReactFlow>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="mb-4 flex justify-end">
              <Link to="/portal/corporativo/whatsapp">
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Gerenciar Templates
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* WhatsApp Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                    WhatsApp ({messageTemplates.whatsapp.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.whatsapp.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum template cadastrado</p>
                  ) : messageTemplates.whatsapp.map((template) => (
                    <div key={template.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(template.content)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs bg-muted p-2 rounded">
                        {template.content.substring(0, 100)}...
                      </div>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {variable}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* E-mail Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-blue-600" />
                    E-mail ({messageTemplates.email.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.email.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum template cadastrado</p>
                  ) : messageTemplates.email.map((template) => (
                    <div key={template.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(template.content)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs bg-muted p-2 rounded">
                        {template.content.substring(0, 100)}...
                      </div>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {variable}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* SMS Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-purple-600" />
                    SMS ({messageTemplates.sms.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.sms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum template cadastrado</p>
                  ) : messageTemplates.sms.map((template) => (
                    <div key={template.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(template.content)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs bg-muted p-2 rounded">
                        {template.content}
                      </div>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {variable}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Geração Automática de Templates</CardTitle>
                  <CardDescription>Configure a personalização automática das mensagens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Variáveis Disponíveis</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['nome', 'valor', 'data_vencimento', 'dias', 'link', 'telefone', 'condominio'].map((variable) => (
                        <div key={variable} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{`{${variable}}`}</span>
                          <Button variant="ghost" size="sm">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Personalização por Condomínio</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher condomínio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="villa-real">Villa Real</SelectItem>
                        <SelectItem value="jardins">Residencial Jardins</SelectItem>
                        <SelectItem value="central-park">Central Park</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Gerar Templates Personalizados
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Integração com Boletos</CardTitle>
                  <CardDescription>Configure a atualização automática de dados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Webhook</Label>
                    <Input placeholder="https://api.banco.com/webhook" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Frequência de Sincronização</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="A cada 4 horas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">A cada 1 hora</SelectItem>
                        <SelectItem value="4h">A cada 4 horas</SelectItem>
                        <SelectItem value="12h">A cada 12 horas</SelectItem>
                        <SelectItem value="24h">Uma vez por dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium text-sm">Status da Sincronização</p>
                      <p className="text-xs text-gray-600">Última: 2 horas atrás</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Testar Integração
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Diálogo de Configurações Avançadas */}
      <Dialog open={advancedSettingsOpen} onOpenChange={setAdvancedSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações Avançadas do Workflow</DialogTitle>
            <DialogDescription>
              Configure opções avançadas de execução e notificações
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">Auto-salvar</Label>
                <p className="text-sm text-muted-foreground">
                  Salvar automaticamente a cada alteração
                </p>
              </div>
              <Switch
                id="auto-save"
                checked={autoSave}
                onCheckedChange={setAutoSave}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify">Notificar ao completar</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificação quando workflow finalizar
                </p>
              </div>
              <Switch
                id="notify"
                checked={notifyOnComplete}
                onCheckedChange={setNotifyOnComplete}
              />
            </div>

            <div className="space-y-2">
              <Label>Prioridade de Execução</Label>
              <Select defaultValue="normal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Retry em caso de falha</Label>
              <Select defaultValue="3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Não tentar novamente</SelectItem>
                  <SelectItem value="1">1 tentativa</SelectItem>
                  <SelectItem value="3">3 tentativas</SelectItem>
                  <SelectItem value="5">5 tentativas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timeout máximo (minutos)</Label>
              <Input type="number" defaultValue="30" min="1" max="1440" />
              <p className="text-xs text-muted-foreground">
                Tempo máximo para cada passo do workflow
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdvancedSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setAdvancedSettingsOpen(false);
              toast({
                title: 'Configurações salvas',
                description: 'As configurações avançadas foram aplicadas'
              });
            }}>
              Salvar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowConfig;