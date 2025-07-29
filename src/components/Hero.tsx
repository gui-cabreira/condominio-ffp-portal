
import React from 'react';
import { ArrowRight, Shield, Users, Scale } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import { useParallax } from '../hooks/useScrollAnimation';

const Hero = () => {
  const scrollY = useParallax();
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden pt-24">
      <AnimatedBackground />
      
      {/* Geometric Pattern with Parallax */}
      <div className="absolute inset-0 opacity-10" style={{ transform: `translateY(${scrollY * 0.5}px)` }}>
        <div className="absolute top-20 right-20 w-64 h-64 border border-ffp-navy rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-20 w-48 h-48 border border-ffp-gold rounded-full animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-ffp-navy rounded-full opacity-50 animate-pulse delay-500" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-ffp-navy animate-fade-in">
            <h1 className="font-playfair text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Fermiano, Ferreira Pinto
              <span className="text-ffp-gold block">Advogados</span>
            </h1>
            
            <p className="text-xl mb-8 text-gray-700 leading-relaxed">
              Segurança jurídica para seu patrimônio e negócios. Especialistas em soluções estratégicas 
              para acordos condominiais, gestão e cobrança.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                onClick={() => scrollToSection('contato')}
                className="bg-ffp-gold text-ffp-navy px-8 py-4 rounded-lg font-semibold hover:bg-ffp-gold-light transition-all duration-300 flex items-center justify-center space-x-2 group"
              >
                <span>Agende uma Consulta</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => scrollToSection('servicos')}
                className="border-2 border-ffp-navy text-ffp-navy px-8 py-4 rounded-lg font-semibold hover:bg-ffp-navy hover:text-white transition-all duration-300"
              >
                Nossos Serviços
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Shield className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-600">Proteção Legal</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-600">Gestão Condominial</p>
              </div>
              <div className="text-center">
                <Scale className="w-8 h-8 text-ffp-gold mx-auto mb-2" />
                <p className="text-sm text-gray-600">Acordos & Cobranças</p>
              </div>
            </div>
          </div>

          <div className="relative animate-scale-in group" style={{ transform: `translateY(${scrollY * -0.1}px)` }}>
            <div className="absolute inset-0 bg-gradient-to-br from-ffp-gold/20 via-ffp-navy/10 to-transparent rounded-3xl blur-3xl animate-pulse opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
            <div className="relative overflow-hidden rounded-2xl">
              <img 
                src="/lovable-uploads/1b1a978c-89e0-4816-b68e-de6446f18cd1.png" 
                alt="FFP Advogados"
                className="relative w-full max-w-sm mx-auto drop-shadow-2xl transform transition-all duration-700 ease-out group-hover:scale-110 opacity-0 animate-[fade-in_1s_ease-out_0.5s_forwards,scale-in_1.2s_ease-out_0.3s_forwards]"
                style={{
                  filter: 'drop-shadow(0 25px 50px rgba(30, 44, 84, 0.3))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
