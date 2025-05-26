
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Calendar, User, ArrowLeft } from 'lucide-react';

const newsData = [
  {
    id: 1,
    title: "Nova Lei do Marco Legal dos Condomínios: O que muda em 2024",
    excerpt: "Entenda as principais mudanças que entram em vigor este ano e como elas afetam a gestão condominial.",
    content: "A nova legislação traz importantes alterações para síndicos e administradoras de condomínios. Entre as principais mudanças estão a obrigatoriedade de prestação de contas digitais, novos prazos para assembleias e maior transparência na gestão financeira. A lei estabelece que todas as decisões importantes devem ser documentadas e disponibilizadas aos condôminos através de plataformas digitais. Além disso, há novas regras para a contratação de serviços terceirizados e a obrigatoriedade de criação de fundos de reserva para emergências. Os síndicos agora têm prazo máximo de 30 dias para responder solicitações dos moradores e devem apresentar relatórios financeiros mensais detalhados.",
    author: "Dr. Carlos Silva",
    date: "2024-01-15",
    category: "Legislação",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop"
  },
  {
    id: 2,
    title: "Como Reduzir Custos com Energia Elétrica no Condomínio",
    excerpt: "Estratégias práticas para diminuir as contas de luz das áreas comuns sem comprometer a segurança.",
    content: "A implementação de LED e sensores de movimento pode gerar economia de até 60% na conta de energia elétrica do condomínio. Outras medidas incluem a instalação de temporizadores em áreas comuns, uso de energia solar para aquecimento de água e piscinas, e a criação de horários específicos para uso de equipamentos de alta potência. É importante também fazer a manutenção regular dos equipamentos elétricos e considerar a troca de elevadores antigos por modelos mais eficientes. A conscientização dos moradores sobre o uso responsável da energia também é fundamental para o sucesso dessas medidas.",
    author: "Eng. Marina Santos",
    date: "2024-01-12",
    category: "Economia",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop"
  },
  {
    id: 3,
    title: "Assembleia Condominial: Guia Completo para Síndicos",
    excerpt: "Passo a passo para organizar assembleias eficientes e dentro da legalidade.",
    content: "A convocação deve ser feita com antecedência mínima de 8 dias, contendo ordem do dia detalhada e documentos necessários. É essencial preparar relatórios financeiros, balancetes e propostas de melhorias com antecedência. Durante a assembleia, é importante manter a ordem, registrar todas as discussões em ata e garantir que as votações sigam os critérios estabelecidos pela convenção. Após a assembleia, a ata deve ser redigida em até 10 dias e disponibilizada a todos os condôminos. Lembre-se de que decisões sobre obras estruturais exigem quórum qualificado de dois terços dos condôminos.",
    author: "Dra. Ana Paula Rocha",
    date: "2024-01-10",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop"
  }
];

const NewsArticle = () => {
  const { id } = useParams();
  const article = newsData.find(item => item.id === parseInt(id || '0'));

  if (!article) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-6 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-ffp-navy mb-4">Artigo não encontrado</h1>
            <Link 
              to="/noticias" 
              className="inline-flex items-center text-ffp-navy hover:text-ffp-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às Notícias
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/noticias" 
            className="inline-flex items-center text-ffp-navy hover:text-ffp-gold transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às Notícias
          </Link>

          <article>
            <div className="mb-6">
              <span className="bg-ffp-gold text-ffp-navy px-4 py-2 rounded-full text-sm font-semibold">
                {article.category}
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-ffp-navy mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center text-gray-600 mb-8 space-x-6">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(article.date)}</span>
              </div>
            </div>

            <div className="mb-8">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-64 lg:h-96 object-cover rounded-lg"
              />
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-xl text-gray-700 font-medium mb-6 leading-relaxed">
                {article.excerpt}
              </p>
              
              <div className="text-gray-800 leading-relaxed space-y-4">
                {article.content.split('. ').map((sentence, index) => (
                  <p key={index} className="text-lg">
                    {sentence}{index < article.content.split('. ').length - 1 ? '.' : ''}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Publicado em {formatDate(article.date)} por {article.author}
                </div>
                <Link 
                  to="/noticias" 
                  className="inline-flex items-center text-ffp-navy hover:text-ffp-gold transition-colors font-semibold"
                >
                  Ver mais notícias
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsArticle;
