
import React from 'react';
import { Users, FileText, Scale, UserCheck, FileCheck, AlertCircle, Shield, MessageSquare, Building } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const Services = () => {
  const condominialServices = [
    {
      icon: Users,
      title: 'Reuniões',
      description: 'Participação de reuniões com os membros do conselho e síndico, sempre que solicitado.'
    },
    {
      icon: FileText,
      title: 'Assembleias',
      description: 'Assessoria e realização de assembleias ordinárias e extraordinárias, sem custo adicional.'
    },
    {
      icon: Scale,
      title: 'Ações Movidas',
      description: 'Acompanhamento de ações movidas em face do condomínio tanto na área cível quanto trabalhista.'
    },
    {
      icon: UserCheck,
      title: 'Trabalhista',
      description: 'Acompanhamento de reclamações trabalhistas de funcionários orgânicos e terceirizados.'
    },
    {
      icon: FileCheck,
      title: 'Contratos',
      description: 'Análise de contratos dos prestadores de serviços, bem como verificação da documentação da empresa a ser contratada.'
    },
    {
      icon: AlertCircle,
      title: 'Inadimplências',
      description: 'Medidas extrajudiciais de cobranças, como realização de plantões online e presenciais, para evitar o aumento da inadimplência. Ajuizamento de ações de execução de taxa condominial. Apresentação de relatórios com a descrição das medidas tomadas, acordos realizados e percentual de inadimplência.'
    },
    {
      icon: Shield,
      title: 'Regimento e Multas',
      description: 'Confecção e alteração de regimento interno, sem custo adicional. Confecção de advertências e multas, com base nas solicitações da sindicância.'
    },
    {
      icon: MessageSquare,
      title: 'Bate Papo com Condômino',
      description: 'Realização de plantões de dúvidas sobre normas do condomínio, como o regimento interno.'
    }
  ];

  const businessServices = [
    {
      icon: Building,
      title: 'Constituição e Reestruturação Societária',
      description: 'Elaboração e revisão de contratos sociais, estatutos e acordos de sócios.'
    },
    {
      icon: FileText,
      title: 'Contratos Empresariais',
      description: 'Redação, revisão e análise de contratos comerciais, parcerias, prestação de serviços, entre outros.'
    },
    {
      icon: AlertCircle,
      title: 'Cobrança Judicial e Extrajudicial',
      description: 'Atuação eficiente na recuperação de créditos empresariais, com foco em soluções céleres e eficazes.'
    },
    {
      icon: Scale,
      title: 'Assessoria Contenciosa Estratégica',
      description: 'Representação em disputas judiciais e arbitrais envolvendo relações comerciais, responsabilidade civil empresarial, quebra de contrato e conflitos societários.'
    },
    {
      icon: FileCheck,
      title: 'Due Diligence e Fusões e Aquisições (M&A)',
      description: 'Apoio jurídico na análise de riscos e estruturação de operações de compra, venda ou incorporação de empresas.'
    },
    {
      icon: UserCheck,
      title: 'Assessoria Jurídica Trabalhista',
      description: 'Soluções jurídicas eficazes e estratégicas para lidar com questões relacionadas ao contrato de trabalho, buscando a redução do passivo trabalhista.'
    }
  ];

  return (
    <section id="servicos" className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border border-ffp-navy rounded-full animate-spin-slow" />
        <div className="absolute bottom-10 right-10 w-24 h-24 border border-ffp-gold rounded-full animate-bounce" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-4xl font-bold text-ffp-navy mb-4">
            Nossos Serviços
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Oferecemos soluções jurídicas completas e especializadas para todas as necessidades 
            do direito condominial e empresarial, com foco na excelência e resultados.
          </p>
        </div>

        {/* Direito Condominial */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="font-playfair text-3xl font-bold text-ffp-navy mb-4">
              Direito Condominial
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Especialistas em soluções estratégicas para acordos condominiais, gestão e cobrança.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
            {condominialServices.map((service, index) => {
              return <ServiceCard key={index} service={service} index={index} />;
            })}
          </div>
        </div>

        {/* Direito Empresarial */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h3 className="font-playfair text-3xl font-bold text-ffp-navy mb-4">
              Direito Empresarial
            </h3>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-600 mb-6">
                <strong className="text-ffp-navy">Segurança jurídica para o crescimento do seu negócio.</strong>
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Na FFP Advogados, oferecemos assessoria jurídica completa e personalizada para empresas de todos os portes, 
                atuando de forma estratégica para prevenir litígios, garantir conformidade legal e viabilizar o crescimento 
                sustentável das atividades empresariais.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Nosso trabalho é ser parceiro do seu negócio, com atuação consultiva e contenciosa nas mais diversas 
                frentes do Direito Empresarial.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
            {businessServices.map((service, index) => {
              return <ServiceCard key={`business-${index}`} service={service} index={index} />;
            })}
          </div>
        </div>

        <div className="text-center mt-12">
          <button className="bg-ffp-navy text-white px-8 py-4 rounded-lg font-semibold hover:bg-ffp-navy-light transition-colors duration-300">
            Solicitar Orçamento
          </button>
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, index }: { service: any, index: number }) => {
  const { isVisible, elementRef } = useScrollAnimation();
  
  return (
    <div 
      ref={elementRef}
      className={`group relative bg-white rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 transform hover:-translate-y-2 mx-2 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        animationDelay: `${index * 100}ms`,
        transitionDelay: `${index * 100}ms`
      }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/5 to-ffp-gold/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="w-14 h-14 bg-gradient-to-br from-ffp-navy to-ffp-navy-light rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
          <service.icon className="w-7 h-7 text-white" />
        </div>
        
        <h3 className="font-montserrat text-lg font-semibold text-ffp-navy mb-3 group-hover:text-ffp-gold transition-colors duration-300">
          {service.title}
        </h3>
        
        <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          {service.description}
        </p>
      </div>

      {/* Animated border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-ffp-gold/30 transition-all duration-300" />
    </div>
  );
};

export default Services;
