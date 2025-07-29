
import React from 'react';
import { Phone, Mail, Instagram, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-4 mb-6">
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-12 w-auto"
              />
              <div>
                <h3 className="font-playfair text-xl font-bold text-ffp-navy">Fermiano, Ferreira Pinto Advogados</h3>
                <p className="text-ffp-gold text-sm">Direito Condominial</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Segurança jurídica para seu patrimônio e negócios. Especialistas em soluções estratégicas 
              para acordos condominiais, gestão e cobrança.
            </p>

            <div className="flex space-x-4">
              <a href="https://instagram.com/ffpadvogados.com.br" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-ffp-gold hover:text-white transition-all">
                <Instagram size={20} className="text-gray-600 hover:text-white" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-playfair text-lg font-semibold mb-6 text-ffp-navy">Serviços</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 hover:text-ffp-gold transition-colors">Acordos Condominiais</a></li>
              <li><a href="#" className="text-gray-600 hover:text-ffp-gold transition-colors">Gestão Condominial</a></li>
              <li><a href="#" className="text-gray-600 hover:text-ffp-gold transition-colors">Cobrança Judicial</a></li>
              <li><a href="#" className="text-gray-600 hover:text-ffp-gold transition-colors">Defesa de Direitos</a></li>
              <li><a href="#" className="text-gray-600 hover:text-ffp-gold transition-colors">Consultoria</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-playfair text-lg font-semibold mb-6 text-ffp-navy">Contato</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-ffp-gold" />
                <span className="text-gray-600 text-sm">(19) 99933-1777</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-ffp-gold" />
                <span className="text-gray-600 text-sm">contato@ffpadvogados.com.br</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Globe size={16} className="text-ffp-gold" />
                <a href="http://www.ffpadvogados.com.br" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-ffp-gold text-sm transition-colors">
                  www.ffpadvogados.com.br
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © 2024 Fermiano, Ferreira Pinto Advogados. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-ffp-gold text-sm transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="text-gray-500 hover:text-ffp-gold text-sm transition-colors">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
