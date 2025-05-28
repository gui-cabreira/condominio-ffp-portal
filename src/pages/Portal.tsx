
import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Shield, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Portal = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-ffp-navy mb-6">
              Portal Corporativo
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Acesse nossos sistemas de gestão e área do cliente para uma experiência completa
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Portal Corporativo */}
            <Card className="bg-white border-2 border-ffp-navy/20 hover:border-ffp-navy/40 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 w-16 h-16 bg-ffp-navy rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-ffp-navy mb-2">
                  Acesso Corporativo
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Para funcionários da FFP Advogados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-ffp-gold" />
                    <span>Sistema de gestão de cobranças</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-ffp-gold" />
                    <span>Controle de documentos</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-ffp-gold" />
                    <span>Gestão de clientes</span>
                  </div>
                </div>
                <Link to="/portal/corporativo" className="block pt-4">
                  <Button className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white font-semibold">
                    Entrar no Sistema
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Portal do Cliente */}
            <Card className="bg-white border-2 border-ffp-gold/20 hover:border-ffp-gold/40 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 w-16 h-16 bg-ffp-gold rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-ffp-navy" />
                </div>
                <CardTitle className="text-2xl text-ffp-navy mb-2">
                  Portal do Cliente
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Área exclusiva para nossos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-ffp-gold" />
                    <span>Acesso aos seus documentos</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-ffp-gold" />
                    <span>Comunicação segura</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-ffp-gold" />
                    <span>Acompanhar processos</span>
                  </div>
                </div>
                <Link to="/portal/cliente" className="block pt-4">
                  <Button className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold">
                    Acessar Área do Cliente
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-600">
              Precisa de ajuda? Entre em contato conosco pelo telefone{' '}
              <a href="tel:+5519999331777" className="text-ffp-navy hover:underline font-semibold">
                (19) 99933-1777
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Portal;
