import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, FileText, CheckCircle, AlertCircle, X, Eye, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const ImportCharges = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // Dados mockados de importações
  const importHistory = [
    {
      id: 1,
      fileName: 'cobrancas_janeiro_2024.xlsx',
      date: '2024-01-15',
      status: 'success',
      processed: 120,
      errors: 0,
      total: 120
    },
    {
      id: 2,
      fileName: 'cobrancas_dezembro_2023.csv',
      date: '2024-01-02',
      status: 'warning',
      processed: 85,
      errors: 3,
      total: 88
    },
    {
      id: 3,
      fileName: 'cobrancas_novembro_2023.xlsx',
      date: '2023-12-01',
      status: 'error',
      processed: 12,
      errors: 45,
      total: 57
    },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);

      // Simular upload
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            setUploadComplete(true);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Com Avisos</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Processando</Badge>;
    }
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
              <h1 className="text-xl font-semibold text-ffp-navy">Importação de Cobranças</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Template Excel
              </Button>
              <Link to="/portal/corporativo/cadastrar-inadimplente">
                <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                  Cadastro Manual
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Importar Arquivo</TabsTrigger>
            <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Upload de Arquivo</CardTitle>
                  <CardDescription>
                    Importe cobranças em lote através de arquivo Excel ou CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!uploadComplete ? (
                    <>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium">Arraste seu arquivo aqui</p>
                          <p className="text-sm text-gray-600">ou clique para selecionar</p>
                          <p className="text-xs text-gray-500">Suporta .xlsx, .xls, .csv (máx 10MB)</p>
                        </div>
                        <Input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          className="mt-4 cursor-pointer"
                        />
                      </div>

                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Processando arquivo...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-green-700 mb-2">
                        Arquivo processado com sucesso!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        120 registros encontrados, 115 válidos, 5 com erros
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => setActiveTab('mapping')}>
                          Revisar Mapeamento
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setUploadComplete(false);
                          setUploadProgress(0);
                        }}>
                          Novo Upload
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Instruções de Importação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-ffp-navy text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-medium">Baixe o template</p>
                        <p className="text-sm text-gray-600">Use nosso modelo para garantir a compatibilidade</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-ffp-navy text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-medium">Preencha os dados</p>
                        <p className="text-sm text-gray-600">Certifique-se de que todos os campos obrigatórios estão preenchidos</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-ffp-navy text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-medium">Faça o upload</p>
                        <p className="text-sm text-gray-600">Arraste o arquivo ou selecione-o</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-ffp-navy text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <p className="font-medium">Revise o mapeamento</p>
                        <p className="text-sm text-gray-600">Confirme se os campos foram identificados corretamente</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Campos Obrigatórios:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Nome do devedor</li>
                      <li>• CPF/CNPJ</li>
                      <li>• Condomínio</li>
                      <li>• Unidade</li>
                      <li>• Valor original</li>
                      <li>• Data de vencimento</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle className="text-ffp-navy">Mapeamento de Campos</CardTitle>
                <CardDescription>
                  Confirme se os campos do arquivo foram identificados corretamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { field: 'Nome', mapped: 'NOME_COMPLETO', status: 'success' },
                    { field: 'CPF', mapped: 'DOCUMENTO', status: 'success' },
                    { field: 'Condomínio', mapped: 'CONDOMINIO_NOME', status: 'success' },
                    { field: 'Unidade', mapped: 'APARTAMENTO', status: 'success' },
                    { field: 'Valor', mapped: 'VALOR_ORIGINAL', status: 'success' },
                    { field: 'Vencimento', mapped: 'DATA_VENC', status: 'warning' },
                    { field: 'Telefone', mapped: 'CONTATO', status: 'success' },
                    { field: 'Email', mapped: null, status: 'error' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.field}</span>
                        {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {item.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                        {item.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {item.mapped || 'Não mapeado'}
                        </span>
                        <Button variant="outline" size="sm">Alterar</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setActiveTab('upload')}>
                    Voltar
                  </Button>
                  <Button className="bg-ffp-navy hover:bg-ffp-navy-dark text-white">
                    Importar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-ffp-navy">Histórico de Importações</CardTitle>
                <CardDescription>
                  Visualize todas as importações realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="font-medium">{item.fileName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(item.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            {item.processed}/{item.total} processados
                          </p>
                          {item.errors > 0 && (
                            <p className="text-sm text-red-600">
                              {item.errors} erros
                            </p>
                          )}
                        </div>
                        
                        {getStatusBadge(item.status)}
                        
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImportCharges;