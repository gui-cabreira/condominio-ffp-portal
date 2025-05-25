
import React from 'react';
import { ArrowRight, Shield, Users, Scale } from 'lucide-react';

const Hero = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy via-ffp-navy-light to-ffp-navy-dark" />
      
      {/* Geometric Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-64 h-64 border border-ffp-gold rounded-full" />
        <div className="absolute bottom-20 left-20 w-48 h-48 border border-ffp-gold rounded-full" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-ffp-gold rounded-full opacity-50" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white animate-fade-in">
            <h1 className="font-playfair text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Especialistas em
              <span className="text-ffp-gold block">Direito Condominial</span>
            </h1>
            
            <p className="text-xl mb-8 text-gray-300 leading-relaxed">
              Soluções jurídicas personalizadas para acordos condominiais, gestão e cobrança. 
              Protegemos seus direitos com excelência e confiança.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                onClick={() => scrollToSection('contato')}
                className="bg-ffp-gold text-ffp-navy px-8 py-4 rounded-lg font-semibold hover:bg-ffp-gold-light transition-all duration-300 flex items-center justify-center space-x-2 group"
              >
                <span>Consulta Gratuita</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => scrollToSection('servicos')}
                className="border-2 border-ffp-gold text-ffp-gold px-8 py-4 rounded-lg font-semibold hover:bg-ffp-gold hover:text-ffp-navy transition-all duration-300"
              >
                Nossos Serviços
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Shield className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-300">Proteção Legal</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-300">Gestão Condominial</p>
              </div>
              <div className="text-center">
                <Scale className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-300">Acordos & Cobranças</p>
              </div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute inset-0 bg-ffp-gold/20 rounded-3xl blur-3xl" />
            <img 
              src="/lovable-uploads/51d17d9a-87dc-4294-a89e-d45f9db1b00f.png" 
              alt="FFP Advogados"
              className="relative w-full max-w-md mx-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
