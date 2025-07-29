
import React from 'react';
import { Award, Clock, Users, Target } from 'lucide-react';

const About = () => {
  const stats = [
    { number: '15+', label: 'Anos de Experiência', icon: Clock },
    { number: '500+', label: 'Casos Resolvidos', icon: Award },
    { number: '200+', label: 'Clientes Atendidos', icon: Users },
    { number: '98%', label: 'Taxa de Sucesso', icon: Target },
  ];

  return (
    <section id="sobre" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-playfair text-4xl font-bold text-ffp-navy mb-6">
              Sobre a FFP Advogados
            </h2>
            
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              A <strong>Fermiano, Ferreira Pinto Advogados</strong> é um escritório especializado 
              em direito condominial, oferecendo soluções jurídicas personalizadas e eficientes 
              para condomínios, síndicos e administradoras.
            </p>

            <p className="text-gray-600 mb-8 leading-relaxed">
              Nossa equipe combina experiência, conhecimento técnico e atendimento humanizado 
              para garantir os melhores resultados. Atuamos com transparência, ética e 
              comprometimento em cada caso.
            </p>

            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-ffp-gold rounded-full mt-2" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1">Especialização Técnica</h4>
                  <p className="text-gray-600">Foco exclusivo em direito condominial e imobiliário</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-ffp-gold rounded-full mt-2" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1">Atendimento Personalizado</h4>
                  <p className="text-gray-600">Soluções customizadas para cada necessidade</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-3 h-3 bg-ffp-gold rounded-full mt-2" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1">Resultados Comprovados</h4>
                  <p className="text-gray-600">Histórico de sucesso e satisfação dos clientes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/10 to-ffp-gold/10 rounded-3xl" />
            <img 
              src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&h=800&fit=crop"
              alt="Escritório FFP Advogados"
              className="relative rounded-3xl shadow-2xl w-full h-96 object-cover"
            />
          </div>
        </div>

        {/* Founders Section */}
        <div className="mt-20 pt-20 border-t border-gray-200">
          <h3 className="font-playfair text-3xl font-bold text-ffp-navy text-center mb-16">
            Nossos Fundadores
          </h3>
          
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Dra. Carla Fermiano */}
            <div className="text-center lg:text-left">
              <div className="relative mb-8 mx-auto lg:mx-0 w-72 h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/20 to-ffp-gold/20 rounded-2xl transform rotate-3" />
                <img 
                  src="/lovable-uploads/7b7904db-b831-475f-8e20-7d9b94ecec7e.png"
                  alt="Dra. Carla Fermiano"
                  className="relative rounded-2xl shadow-2xl w-full h-full object-cover"
                />
              </div>
              
              <h4 className="font-playfair text-2xl font-bold text-ffp-navy mb-2">
                Dra. Carla Fermiano
              </h4>
              <p className="text-ffp-gold font-semibold mb-4">OAB/SP 297.099</p>
              
              <div className="space-y-2 mb-6 text-gray-600">
                <p>• Bacharel em Direito pela FACAMP</p>
                <p>• Pós-Graduação em Direito Público pela Escola Superior de Magistratura – EPM Campinas</p>
                <p>• Pós-Graduação em Direito e Processo do Trabalho Universidade Presbiteriana Mackenzie</p>
                <p>• Especialização de Técnicas Procedimentais Trabalhistas, pela FACAMP</p>
                <p>• Pós-Graduação em Direito Negocial e Imobiliário, pelo Ebradi</p>
                <p>• Membro da ANACON – Associação Nacional da Advocacia Condominial</p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                Possuo uma sólida experiência de mais de 11 anos na atuação condominial, o que me permite 
                oferecer serviços jurídicos de qualidade, atendendo às demandas específicas dos clientes 
                de maneira eficaz e especializada.
              </p>
            </div>

            {/* Dr. Wilson Ferreira Pinto */}
            <div className="text-center lg:text-left">
              <div className="relative mb-8 mx-auto lg:mx-0 w-72 h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-ffp-gold/20 to-ffp-navy/20 rounded-2xl transform -rotate-3" />
                <img 
                  src="/lovable-uploads/f9ca14a4-23f3-42e1-8d55-aa3e85727a6e.png"
                  alt="Dr. Wilson Ferreira Pinto"
                  className="relative rounded-2xl shadow-2xl w-full h-full object-cover"
                />
              </div>
              
              <h4 className="font-playfair text-2xl font-bold text-ffp-navy mb-2">
                Dr. Wilson Ferreira Pinto
              </h4>
              <p className="text-ffp-gold font-semibold mb-4">OAB/SP 341.125</p>
              
              <div className="space-y-2 mb-6 text-gray-600">
                <p>• Bacharel em Direito pela UNITOLEDO</p>
                <p>• Pós-Graduação lato sensu em Direito Público pela Pontifícia Universidade Católica de Campinas</p>
                <p>• Pós-Graduação em Direito Condominial e Imobiliário pela Pontifícia Universidade Católica de Campinas</p>
                <p>• Membro da ANACON – Associação Nacional da Advocacia Condominial</p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                Com mais de 12 anos de experiência no campo do Direito Imobiliário e Condominial, 
                oferece um conhecimento sólido e atualizado que garante soluções jurídicas eficazes 
                e de confiança para seus clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-ffp-navy to-ffp-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              <div className="font-playfair text-3xl font-bold text-ffp-navy mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
