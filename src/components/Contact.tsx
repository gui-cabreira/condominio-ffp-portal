import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mensagem enviada!",
      description: "Entraremos em contato em breve. Obrigado pelo interesse!",
    });
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section id="contato" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-4xl font-bold text-ffp-navy mb-4">
            Entre em Contato
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Segurança jurídica para seu patrimônio e negócios. 
            Agende uma consulta e conheça nossas soluções estratégicas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-gray-50 rounded-xl p-8 shadow-lg">
              <h3 className="font-playfair text-2xl font-semibold text-ffp-navy mb-6">
                Informações de Contato
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-ffp-navy rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-ffp-navy mb-1">Telefone</h4>
                    <p className="text-gray-600">(19) 99933-1777</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-ffp-navy rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-ffp-navy mb-1">E-mail</h4>
                    <p className="text-gray-600">contato@advogados.com.br</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-ffp-navy rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-ffp-navy mb-1">Endereço</h4>
                    <p className="text-gray-600">
                      Av. Paulista, 1000 - Conjunto 101<br />
                      Bela Vista, São Paulo - SP<br />
                      CEP: 01310-100
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-ffp-navy rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-ffp-navy mb-1">Horário de Atendimento</h4>
                    <p className="text-gray-600">
                      Segunda a Sexta: 8h às 18h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-ffp-navy text-white rounded-xl p-8">
              <h3 className="font-playfair text-xl font-semibold mb-4">
                Agende uma Consulta
              </h3>
              <p className="text-gray-300 mb-4">
                Especialistas em soluções estratégicas para questões condominiais. 
                Entre em contato e proteja seu patrimônio com segurança jurídica.
              </p>
              <button className="bg-ffp-gold text-ffp-navy px-6 py-3 rounded-lg font-semibold hover:bg-ffp-gold-light transition-colors">
                Agendar Consulta
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 rounded-xl p-8 shadow-lg">
            <h3 className="font-playfair text-2xl font-semibold text-ffp-navy mb-6">
              Envie sua Mensagem
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ffp-navy mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ffp-gold focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-ffp-navy mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ffp-gold focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ffp-navy mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ffp-gold focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-ffp-navy mb-2">
                  Assunto
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ffp-gold focus:border-transparent"
                >
                  <option value="">Selecione um assunto</option>
                  <option value="acordos">Acordos Condominiais</option>
                  <option value="gestao">Gestão Condominial</option>
                  <option value="cobranca">Cobrança Judicial</option>
                  <option value="consultoria">Consultoria</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-ffp-navy mb-2">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ffp-gold focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-ffp-navy text-white px-6 py-4 rounded-lg font-semibold hover:bg-ffp-navy-light transition-colors flex items-center justify-center space-x-2"
              >
                <Send size={20} />
                <span>Enviar Mensagem</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
