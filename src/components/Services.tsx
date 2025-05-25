
import React from 'react';
import { FileText, Users, DollarSign, Shield, Building, Gavel } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: FileText,
      title: 'Acordos Condominiais',
      description: 'Elaboração e revisão de contratos, regulamentos internos e convenções condominiais.',
      features: ['Contratos personalizados', 'Revisão jurídica', 'Adequação legal']
    },
    {
      icon: Users,
      title: 'Gestão Condominial',
      description: 'Assessoria completa para administração de condomínios e resolução de conflitos.',
      features: ['Assessoria jurídica', 'Mediação de conflitos', 'Consultoria administrativa']
    },
    {
      icon: DollarSign,
      title: 'Cobrança Judicial',
      description: 'Recuperação de inadimplência condominial através de ações judiciais eficientes.',
      features: ['Ações de cobrança', 'Execução de débitos', 'Negociação extrajudicial']
    },
    {
      icon: Shield,
      title: 'Defesa de Direitos',
      description: 'Proteção dos direitos dos condôminos e síndicos em todas as instâncias.',
      features: ['Defesa judicial', 'Recursos', 'Acompanhamento processual']
    },
    {
      icon: Building,
      title: 'Consultoria Imobiliária',
      description: 'Orientação jurídica para questões relacionadas ao direito imobiliário.',
      features: ['Análise de contratos', 'Due diligence', 'Regularização']
    },
    {
      icon: Gavel,
      title: 'Mediação e Arbitragem',
      description: 'Resolução de conflitos através de métodos alternativos ao processo judicial.',
      features: ['Mediação', 'Arbitragem', 'Conciliação']
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-100"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-ffp-navy to-ffp-navy-light rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="font-playfair text-xl font-semibold text-ffp-navy mb-4">
                {service.title}
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {service.description}
              </p>

              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                    <div className="w-2 h-2 bg-ffp-gold rounded-full mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>
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
