import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Award, Clock, Users, Target, Quote } from 'lucide-react';

const About = () => {
  const titleRef1 = useScrollAnimation();
  const titleRef2 = useScrollAnimation(); 
  const titleRef3 = useScrollAnimation();
  const photoRef1 = useScrollAnimation();
  const photoRef2 = useScrollAnimation();
  
  const stats = [
    { number: '15+', label: 'Anos de Experiência', icon: Clock },
    { number: '500+', label: 'Casos Resolvidos', icon: Award },
    { number: '200+', label: 'Clientes Atendidos', icon: Users },
    { number: '98%', label: 'Taxa de Sucesso', icon: Target },
  ];

  return (
    <section id="sobre" className="py-20 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-ffp-gold/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-ffp-navy/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-ffp-navy/3 to-ffp-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Main Title with slide animation */}
        <div 
          ref={titleRef1.elementRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            titleRef1.isVisible 
              ? 'opacity-100 transform translate-x-0' 
              : 'opacity-0 transform -translate-x-20'
          }`}
        >
          <h2 className="font-playfair text-4xl font-bold text-ffp-navy mb-4 animate-slide-in-left">
            Sobre a FFP Advogados
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-in-right animation-delay-300">
            Conheça nossa equipe de especialistas em direito condominial, 
            comprometidos em oferecer soluções jurídicas personalizadas e eficazes.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in">
            <h3 className="font-playfair text-3xl font-bold text-ffp-navy mb-6 relative animate-slide-in-left">
              Nossa Missão
              <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-ffp-gold to-ffp-navy rounded-full" />
            </h3>
            
            <p className="text-gray-600 text-lg mb-6 leading-relaxed animate-slide-in-right animation-delay-200">
              A <strong className="text-ffp-navy">Fermiano, Ferreira Pinto Advogados</strong> é um escritório especializado 
              em direito condominial, oferecendo soluções jurídicas personalizadas e eficientes 
              para condomínios, síndicos e administradoras.
            </p>

            <p className="text-gray-600 mb-8 leading-relaxed animate-slide-in-left animation-delay-300">
              Nossa equipe combina experiência, conhecimento técnico e atendimento humanizado 
              para garantir os melhores resultados. Atuamos com transparência, ética e 
              comprometimento em cada caso.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 group hover:transform hover:scale-105 transition-all duration-300 animate-float-up animation-delay-500">
                <div className="w-4 h-4 bg-gradient-to-br from-ffp-gold to-ffp-navy rounded-full mt-2 group-hover:animate-pulse" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1 text-lg">Especialização Técnica</h4>
                  <p className="text-gray-600">Foco exclusivo em direito condominial e imobiliário</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group hover:transform hover:scale-105 transition-all duration-300 animate-float-up animation-delay-700">
                <div className="w-4 h-4 bg-gradient-to-br from-ffp-gold to-ffp-navy rounded-full mt-2 group-hover:animate-pulse" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1 text-lg">Atendimento Personalizado</h4>
                  <p className="text-gray-600">Soluções customizadas para cada necessidade</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group hover:transform hover:scale-105 transition-all duration-300 animate-float-up animation-delay-1000">
                <div className="w-4 h-4 bg-gradient-to-br from-ffp-gold to-ffp-navy rounded-full mt-2 group-hover:animate-pulse" />
                <div>
                  <h4 className="font-semibold text-ffp-navy mb-1 text-lg">Resultados Comprovados</h4>
                  <p className="text-gray-600">Histórico de sucesso e satisfação dos clientes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/20 to-ffp-gold/20 rounded-3xl transform group-hover:rotate-1 transition-transform duration-500" />
            <div className="absolute -inset-4 bg-gradient-to-r from-ffp-navy/10 via-transparent to-ffp-gold/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <img 
              src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&h=800&fit=crop"
              alt="Escritório FFP Advogados"
              className="relative rounded-3xl shadow-2xl w-full h-96 object-cover group-hover:shadow-3xl transition-all duration-500"
            />
          </div>
        </div>

        {/* Founders Section */}
        <div className="mt-32 pt-20 relative">
          {/* Founders Title with slide animation */}
          <div 
            ref={titleRef2.elementRef}
            className={`text-center mb-20 transition-all duration-1000 ${
              titleRef2.isVisible 
                ? 'opacity-100 transform translate-x-0' 
                : 'opacity-0 transform translate-x-20'
            }`}
          >
            <h3 className="font-playfair text-4xl font-bold text-ffp-navy mb-4 relative inline-block animate-slide-in-right">
              Nossos Fundadores
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-ffp-gold to-ffp-navy rounded-full" />
            </h3>
            <p className="text-gray-600 text-lg mt-6 max-w-2xl mx-auto animate-slide-in-left animation-delay-300">
              Conheça os profissionais que lideram nossa equipe com expertise e dedicação
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-20">
            {/* Dra. Carla Fermiano */}
            <div 
              ref={photoRef1.elementRef}
              className="text-center lg:text-left group"
            >
              {/* Photo with INCREDIBLE reveal animation */}
              <div 
                className={`relative mb-10 mx-auto lg:mx-0 w-64 h-80 transition-all duration-2000 ${
                  photoRef1.isVisible 
                    ? 'opacity-100 animate-photo-reveal' 
                    : 'opacity-0 transform scale-125 rotate-12'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/40 to-ffp-gold/40 rounded-3xl transform rotate-3 group-hover:rotate-6 transition-transform duration-700 shadow-2xl" />
                <div className="absolute -inset-4 bg-gradient-to-r from-ffp-navy/30 to-ffp-gold/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700 animate-pulse" />
                <div className="relative overflow-hidden rounded-3xl shadow-3xl">
                  <img 
                    src="/lovable-uploads/7b7904db-b831-475f-8e20-7d9b94ecec7e.png"
                    alt="Dra. Carla Fermiano"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ffp-gold/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
              </div>
              
              {/* Content with staggered slide animations */}
              <div 
                className={`transition-all duration-1000 delay-500 ${
                  photoRef1.isVisible 
                    ? 'opacity-100 transform translate-x-0' 
                    : 'opacity-0 transform translate-x-10'
                }`}
              >
                <h4 className="font-playfair text-3xl font-bold text-ffp-navy mb-2 animate-slide-in-left">
                  Dra. Carla Fermiano
                </h4>
                <p className="text-ffp-gold font-semibold mb-6 text-lg animate-slide-in-right animation-delay-200">OAB/SP 297.099</p>

                {/* Quote destacada */}
                <div className="relative mb-8 p-6 bg-gradient-to-br from-ffp-navy/5 to-ffp-gold/5 rounded-2xl border-l-4 border-ffp-gold shadow-lg group-hover:shadow-xl transition-shadow duration-500 animate-float-up animation-delay-700">
                  <Quote className="absolute top-4 left-4 w-6 h-6 text-ffp-gold opacity-50" />
                  <p className="text-ffp-navy font-medium text-lg italic pl-8 leading-relaxed">
                    "Possuo uma sólida experiência de mais de 11 anos na atuação condominial, o que me permite 
                    oferecer serviços jurídicos de qualidade, atendendo às demandas específicas dos clientes 
                    de maneira eficaz e especializada."
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 group-hover:shadow-xl transition-shadow duration-500">
                  <h5 className="font-semibold text-ffp-navy mb-4 text-lg">Formação Acadêmica</h5>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Bacharel em Direito pela FACAMP</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Pós-Graduação em Direito Público pela Escola Superior de Magistratura – EPM Campinas</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Pós-Graduação em Direito e Processo do Trabalho Universidade Presbiteriana Mackenzie</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Especialização de Técnicas Procedimentais Trabalhistas, pela FACAMP</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Pós-Graduação em Direito Negocial e Imobiliário, pelo Ebradi</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Membro da ANACON – Associação Nacional da Advocacia Condominial</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dr. Wilson Ferreira Pinto */}
            <div className="text-center lg:text-left group">
              {/* Photo with INCREDIBLE reveal animation */}
              <div 
                ref={photoRef2.elementRef}
                className={`relative mb-10 mx-auto lg:mx-0 w-64 h-80 transition-all duration-2000 delay-700 ${
                  photoRef2.isVisible 
                    ? 'opacity-100 animate-photo-reveal' 
                    : 'opacity-0 transform scale-125 rotate-12'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-ffp-gold/40 to-ffp-navy/40 rounded-3xl transform -rotate-3 group-hover:-rotate-6 transition-transform duration-700 shadow-2xl" />
                <div className="absolute -inset-4 bg-gradient-to-r from-ffp-gold/30 to-ffp-navy/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700 animate-pulse" />
                <div className="relative overflow-hidden rounded-3xl shadow-3xl">
                  <img 
                    src="/lovable-uploads/f9ca14a4-23f3-42e1-8d55-aa3e85727a6e.png"
                    alt="Dr. Wilson Ferreira Pinto"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ffp-gold/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
              </div>
              
              {/* Content with staggered slide animations */}
              <div 
                ref={titleRef3.elementRef}
                className={`transition-all duration-1000 delay-1000 ${
                  titleRef3.isVisible 
                    ? 'opacity-100 transform translate-x-0' 
                    : 'opacity-0 transform -translate-x-10'
                }`}
              >
                <h4 className="font-playfair text-3xl font-bold text-ffp-navy mb-2 animate-slide-in-right">
                  Dr. Wilson Ferreira Pinto
                </h4>
                <p className="text-ffp-gold font-semibold mb-6 text-lg animate-slide-in-left animation-delay-200">OAB/SP 341.125</p>

                {/* Quote destacada */}
                <div className="relative mb-8 p-6 bg-gradient-to-br from-ffp-gold/5 to-ffp-navy/5 rounded-2xl border-l-4 border-ffp-navy shadow-lg group-hover:shadow-xl transition-shadow duration-500 animate-float-up animation-delay-700">
                  <Quote className="absolute top-4 left-4 w-6 h-6 text-ffp-navy opacity-50" />
                  <p className="text-ffp-navy font-medium text-lg italic pl-8 leading-relaxed">
                    "Com mais de 08 anos de experiência no campo do Direito Imobiliário e Condominial, 
                    trago um conhecimento sólido e atualizado para oferecer soluções jurídicas eficientes."
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 group-hover:shadow-xl transition-shadow duration-500">
                  <h5 className="font-semibold text-ffp-navy mb-4 text-lg">Formação Acadêmica</h5>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Bacharel em Direito pela UNITOLEDO</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Pós-Graduação lato sensu em Direito Público pela Pontifícia Universidade Católica de Campinas</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Pós-Graduação em Direito Condominial e Imobiliário pela Pontifícia Universidade Católica de Campinas</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-ffp-gold rounded-full mt-2 flex-shrink-0" />
                      <p>Membro da ANACON – Associação Nacional da Advocacia Condominial</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics with amazing animations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-32 pt-20 border-t border-gradient-to-r from-transparent via-gray-200 to-transparent">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group hover:transform hover:scale-110 transition-all duration-500 animate-float-up" style={{animationDelay: `${index * 200}ms`}}>
              <div className="w-20 h-20 bg-gradient-to-br from-ffp-navy via-ffp-navy to-ffp-gold rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:shadow-2xl group-hover:animate-pulse transition-all duration-500">
                <stat.icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="font-playfair text-4xl font-bold text-ffp-navy mb-2 group-hover:text-ffp-gold transition-colors duration-500">
                {stat.number}
              </div>
              <div className="text-gray-600 font-medium text-lg group-hover:text-ffp-navy transition-colors duration-300">
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