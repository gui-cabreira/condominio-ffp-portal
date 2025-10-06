import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Sparkles, Check, Loader2, FileText, User, Building2, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const RegisterDefaulter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 10MB',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error: functionError } = await supabase.functions.invoke('process-boleto-ai', {
        body: formData,
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Erro ao chamar a função');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: '✨ Boleto processado com sucesso!',
        description: 'Todos os dados foram extraídos e cadastrados automaticamente.'
      });
    } catch (err: any) {
      console.error('Erro ao processar:', err);
      setError(err.message || 'Erro ao processar boleto');
      toast({
        title: 'Erro ao processar',
        description: err.message || 'Ocorreu um erro ao processar o boleto',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
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
              <h1 className="text-xl font-semibold text-ffp-navy">Cadastro Inteligente de Inadimplente</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 border-2 border-ffp-gold/20 bg-gradient-to-br from-white to-ffp-gold/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-ffp-gold/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-ffp-gold" />
            </div>
            <CardTitle className="text-2xl text-ffp-navy">Processamento Automático com IA</CardTitle>
            <CardDescription className="text-base mt-2">
              Faça upload do boleto e deixe nossa IA extrair <strong>todos os dados automaticamente</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg">
                <User className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Dados do Inadimplente</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Condomínio e Unidade</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Valores e Vencimento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload do Boleto
            </CardTitle>
            <CardDescription>
              Formatos aceitos: PNG, JPG, JPEG (máx. 10MB) - tire uma foto ou screenshot do boleto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Área de Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-ffp-gold transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {file ? (
                  <div>
                    <p className="text-lg font-medium text-ffp-navy mb-2">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-ffp-navy mb-2">
                      Clique para selecionar o boleto
                    </p>
                    <p className="text-sm text-gray-500">ou arraste e solte aqui</p>
                  </div>
                )}
              </label>
            </div>

            {/* Botão de Processar */}
            {file && !result && (
              <Button 
                className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold py-6 text-lg"
                onClick={processFile}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Processar Boleto com IA
                  </>
                )}
              </Button>
            )}

            {/* Erro */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Resultado */}
            {result && result.success && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">
                    ✨ Boleto processado com sucesso! Todos os dados foram cadastrados automaticamente.
                  </AlertDescription>
                </Alert>

                {/* Dados Extraídos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Administradora */}
                  {result.data?.extracted?.administradora && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Administradora
                          <Badge variant="outline" className="ml-auto">
                            {result.data.created.administratorId ? 'Encontrada' : 'Criada'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="font-medium">{result.data.extracted.administradora.nome}</p>
                        {result.data.extracted.administradora.cnpj && (
                          <p className="text-sm text-gray-600">CNPJ: {result.data.extracted.administradora.cnpj}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Condomínio */}
                  {result.data?.extracted?.condominio && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Condomínio
                          <Badge variant="outline" className="ml-auto">
                            {result.data.created.condominiumId ? 'Encontrado' : 'Criado'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="font-medium">{result.data.extracted.condominio.nome}</p>
                        {result.data.extracted.condominio.endereco && (
                          <p className="text-sm text-gray-600">{result.data.extracted.condominio.endereco}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Inadimplente */}
                  {result.data?.extracted?.inadimplente && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Inadimplente
                          <Badge variant="outline" className="ml-auto">
                            Unidade {result.data.extracted.inadimplente.unidade}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="font-medium">{result.data.extracted.inadimplente.nome}</p>
                        {result.data.extracted.inadimplente.cpf && (
                          <p className="text-sm text-gray-600">CPF: {result.data.extracted.inadimplente.cpf}</p>
                        )}
                        {result.data.extracted.inadimplente.telefone && (
                          <p className="text-sm text-gray-600">Tel: {result.data.extracted.inadimplente.telefone}</p>
                        )}
                        {result.data.extracted.inadimplente.email && (
                          <p className="text-sm text-gray-600">Email: {result.data.extracted.inadimplente.email}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Cobrança */}
                  {result.data?.extracted?.cobranca && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Cobrança
                          <Badge className="ml-auto bg-green-500">Criada</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="font-medium text-lg">R$ {result.data.extracted.cobranca.valor?.toFixed(2)}</p>
                        {result.data.extracted.cobranca.vencimento && (
                          <p className="text-sm text-gray-600">
                            Vencimento: {new Date(result.data.extracted.cobranca.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {result.data.extracted.cobranca.descricao && (
                          <p className="text-sm text-gray-600">{result.data.extracted.cobranca.descricao}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-ffp-navy hover:bg-ffp-navy-dark"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                  >
                    Processar Novo Boleto
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/portal/corporativo/cobrancas">
                      Ver Cobranças
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">💡 Como funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Faça upload da imagem ou PDF do boleto</li>
              <li>Nossa IA extrai automaticamente todos os dados do boleto</li>
              <li>Verifica se a administradora e condomínio já existem no sistema</li>
              <li>Cria novos registros se necessário</li>
              <li>Vincula o inadimplente à unidade e cria a cobrança</li>
              <li>Tudo pronto para iniciar o workflow de cobrança!</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterDefaulter;