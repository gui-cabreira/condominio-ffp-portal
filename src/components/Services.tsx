
import React from 'react';
import { Users, FileText, Scale, UserCheck, FileCheck, AlertCircle, Shield, MessageSquare } from 'lucide-react';

const Services = () => {
  const services = [
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

  return (
    <section id="servicos" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-4xl font-bold text-ffp-navy mb-4">
            Nossos Serviços
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Oferecemos soluções jurídicas completas e especializadas para todas as necessidades 
            do direito condominial, com foco na excelência e resultados.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-ffp-navy to-ffp-navy-light rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="font-montserrat text-lg font-semibold text-ffp-navy mb-3">
                {service.title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
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

export default Services;
