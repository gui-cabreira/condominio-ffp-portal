import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Play, MessageCircle, Mail, FileText, Clock, Settings2, Wand2, Copy, Download, Upload, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LoopNode } from '@/components/workflow/LoopNode';
import { useWorkflow } from '@/hooks/useWorkflow';

// Tipos de nós personalizados
const MessageNode = ({ data }: { data: any }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(data.message || '');

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

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 min-w-[250px] shadow-md">
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-semibold text-sm capitalize">{data.type}</span>
        <span className="text-xs text-gray-500">+{data.delay || 0} dias</span>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="text-sm"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              data.message = message;
              setIsEditing(false);
            }}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded"
          onClick={() => setIsEditing(true)}
        >
          {data.message || 'Clique para editar a mensagem...'}
        </div>
      )}

      {/* Handles para conexões */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
    </div>
  );
};

const DelayNode = ({ data }: { data: any }) => {
  const [delay, setDelay] = useState(data.delay || 1);

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 min-w-[180px] shadow-md">
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

      {/* Handles para conexões */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
    </div>
  );
};

const StartNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-full p-4 min-w-[120px] shadow-md text-center">
      <div className="flex items-center justify-center gap-2">
        <Play className="w-4 h-4 text-green-600" />
        <span className="font-semibold text-sm">Início</span>
      </div>
      
      {/* Handle para saída */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
    </div>
  );
};

const nodeTypes = {
  message: MessageNode,
  delay: DelayNode,
  start: StartNode,
  loop: LoopNode,
};

const WorkflowConfig = () => {
  const [workflowName, setWorkflowName] = useState('Workflow Padrão');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('flow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>();
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
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type: string, nodeType: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: nodeType,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 200 },
      data: { 
        type,
        message: '',
        delay: nodeType === 'delay' ? 1 : undefined
      },
    };
    setNodes((nds) => [...nds, newNode]);
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
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

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

  // Templates de mensagem pré-definidos
  const messageTemplates = {
    whatsapp: [
      {
        name: 'Primeiro Contato - Amigável',
        content: `Olá {nome}! 😊

Seu boleto do condomínio no valor de {valor} vence em {dias} dias.

📱 Acesse facilmente: {link}

Qualquer dúvida, estou aqui para ajudar!`,
        variables: ['nome', 'valor', 'dias', 'link']
      },
      {
        name: 'Lembrete - Vencimento Próximo',
        content: `Oi {nome}! ⏰

Lembrete: seu boleto de {valor} vence amanhã.

💳 Pague agora: {link}

Evite juros e mantenha sua situação em dia! 👍`,
        variables: ['nome', 'valor', 'link']
      },
      {
        name: 'Cobrança - Vencido',
        content: `{nome}, seu boleto de {valor} está vencido há {dias_vencido} dias.

🚨 URGENTE: Regularize sua situação
💰 Valor atualizado: {valor_atualizado}
📞 Em caso de dúvidas: {telefone}

Acesse: {link}`,
        variables: ['nome', 'valor', 'dias_vencido', 'valor_atualizado', 'telefone', 'link']
      }
    ],
    email: [
      {
        name: 'E-mail Formal - Primeira Cobrança',
        content: `Prezado(a) {nome},

Esperamos que este e-mail o(a) encontre bem.

Informamos que o boleto referente ao condomínio no valor de {valor} encontra-se em aberto, com vencimento para {data_vencimento}.

Para sua comodidade, disponibilizamos o link direto para pagamento:
{link}

Atenciosamente,
FFP Advogados`,
        variables: ['nome', 'valor', 'data_vencimento', 'link']
      },
      {
        name: 'E-mail - Segunda Via',
        content: `{nome},

Segue segunda via do seu boleto:

Valor: {valor}
Vencimento: {data_vencimento}
Link: {link}

Caso já tenha efetuado o pagamento, desconsidere este e-mail.

Atenciosamente,
Equipe de Cobrança`,
        variables: ['nome', 'valor', 'data_vencimento', 'link']
      }
    ],
    sms: [
      {
        name: 'SMS - Lembrete',
        content: `{nome}, seu boleto de {valor} vence em {dias} dias. Acesse: {link_curto}`,
        variables: ['nome', 'valor', 'dias', 'link_curto']
      },
      {
        name: 'SMS - Vencido',
        content: `URGENTE: {nome}, boleto vencido de {valor}. Regularize: {link_curto}`,
        variables: ['nome', 'valor', 'link_curto']
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/portal/corporativo/dashboard" className="mr-4">
                <ArrowLeft className="w-5 h-5 text-ffp-navy hover:text-ffp-gold" />
              </Link>
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-semibold text-ffp-navy">Configuração de Workflow</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline">Pré-visualizar</Button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                          Arraste e conecte os elementos para criar seu fluxo de cobrança
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configurações Avançadas
                      </Button>
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
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-gray-50"
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* WhatsApp Templates */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-ffp-navy flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                      WhatsApp
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.whatsapp.map((template, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Wand2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        {template.content.substring(0, 100)}...
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {`{${variable}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* E-mail Templates */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-ffp-navy flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-blue-600" />
                      E-mail
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.email.map((template, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Wand2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        {template.content.substring(0, 100)}...
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {`{${variable}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* SMS Templates */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-ffp-navy flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-600" />
                      SMS
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageTemplates.sms.map((template, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Wand2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        {template.content}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {`{${variable}}`}
                          </span>
                        ))}
                      </div>
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
      </div>
    </div>
  );
};

export default WorkflowConfig;