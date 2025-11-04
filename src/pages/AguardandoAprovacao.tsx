import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AguardandoAprovacao = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/corporativo');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-yellow-100 rounded-full p-4">
                    <Clock className="w-12 h-12 text-yellow-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-ffp-navy">
                  Cadastro Aguardando Aprovação
                </CardTitle>
                <CardDescription className="text-gray-600 text-base mt-2">
                  Seu cadastro foi recebido com sucesso!
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Seu acesso ao sistema está pendente de aprovação por um administrador. 
                    Você receberá uma notificação por e-mail assim que seu cadastro for aprovado.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-ffp-navy">Precisa de ajuda?</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-ffp-navy mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">E-mail</p>
                        <a 
                          href="mailto:suporte@ffpadvogados.com.br" 
                          className="text-sm text-ffp-navy hover:text-ffp-gold"
                        >
                          suporte@ffpadvogados.com.br
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-ffp-navy mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Telefone</p>
                        <a 
                          href="tel:+5511999999999" 
                          className="text-sm text-ffp-navy hover:text-ffp-gold"
                        >
                          (11) 99999-9999
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full border-ffp-navy text-ffp-navy hover:bg-ffp-navy hover:text-white"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Fazer Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm">
                Geralmente as aprovações são processadas em até 24 horas úteis.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AguardandoAprovacao;
