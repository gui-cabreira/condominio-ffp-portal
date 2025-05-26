
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsCard from '@/components/NewsCard';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const newsData = [
  {
    id: 1,
    title: "Nova Lei do Marco Legal dos Condomínios: O que muda em 2024",
    excerpt: "Entenda as principais mudanças que entram em vigor este ano e como elas afetam a gestão condominial.",
    content: "A nova legislação traz importantes alterações para síndicos e administradoras...",
    author: "Dr. Carlos Silva",
    date: "2024-01-15",
    category: "Legislação",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop"
  },
  {
    id: 2,
    title: "Como Reduzir Custos com Energia Elétrica no Condomínio",
    excerpt: "Estratégias práticas para diminuir as contas de luz das áreas comuns sem comprometer a segurança.",
    content: "A implementação de LED e sensores de movimento pode gerar economia de até 60%...",
    author: "Eng. Marina Santos",
    date: "2024-01-12",
    category: "Economia",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop"
  },
  {
    id: 3,
    title: "Assembleia Condominial: Guia Completo para Síndicos",
    excerpt: "Passo a passo para organizar assembleias eficientes e dentro da legalidade.",
    content: "A convocação deve ser feita com antecedência mínima de 8 dias...",
    author: "Dra. Ana Paula Rocha",
    date: "2024-01-10",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop"
  },
  {
    id: 4,
    title: "Inadimplência Condominial: Estratégias de Cobrança Eficazes",
    excerpt: "Métodos legais e diplomáticos para reduzir a inadimplência sem gerar conflitos.",
    content: "A negociação amigável deve sempre ser a primeira opção...",
    author: "Roberto Fernandes",
    date: "2024-01-08",
    category: "Cobrança",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop"
  },
  {
    id: 5,
    title: "Sustentabilidade em Condomínios: Tendências para 2024",
    excerpt: "Como implementar práticas sustentáveis que geram economia e valorizam o imóvel.",
    content: "A coleta seletiva e compostagem podem reduzir custos com lixo em 40%...",
    author: "Bióloga Fernanda Lima",
    date: "2024-01-05",
    category: "Sustentabilidade",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop"
  },
  {
    id: 6,
    title: "Segurança Condominial: Novas Tecnologias Acessíveis",
    excerpt: "Sistemas modernos de segurança que cabem no orçamento do condomínio.",
    content: "Câmeras IP e controle de acesso digital se tornaram mais acessíveis...",
    author: "Especialista José Carlos",
    date: "2024-01-03",
    category: "Segurança",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop"
  },
  {
    id: 7,
    title: "Manutenção Preventiva: Cronograma Anual Essencial",
    excerpt: "Planejamento de manutenções que evita gastos emergenciais e preserva o patrimônio.",
    content: "A manutenção preventiva pode reduzir custos de reparo em até 70%...",
    author: "Eng. Paulo Mendes",
    date: "2023-12-28",
    category: "Manutenção",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop"
  },
  {
    id: 8,
    title: "Direitos e Deveres dos Condôminos: Guia Atualizado",
    excerpt: "Esclarecimentos sobre as responsabilidades de cada morador no condomínio.",
    content: "O uso das áreas comuns deve respeitar as regras estabelecidas em assembleia...",
    author: "Advogada Luciana Martins",
    date: "2023-12-25",
    category: "Direitos",
    image: "https://images.unsplash.com/photo-1589216532372-af77b5562c7d?w=800&h=400&fit=crop"
  },
  {
    id: 9,
    title: "Administração Profissional vs. Síndico Morador",
    excerpt: "Vantagens e desvantagens de cada modelo de gestão condominial.",
    content: "A escolha depende do tamanho e complexidade do condomínio...",
    author: "Consultor Marcus Oliveira",
    date: "2023-12-22",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop"
  },
  {
    id: 10,
    title: "Obras no Condomínio: Como Aprovar e Executar Legalmente",
    excerpt: "Procedimentos necessários para reformas e melhorias nas áreas comuns.",
    content: "Obras estruturais exigem aprovação em assembleia com quórum qualificado...",
    author: "Arquiteta Sandra Costa",
    date: "2023-12-20",
    category: "Obras",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=400&fit=crop"
  },
  {
    id: 11,
    title: "Condomínio Digital: Aplicativos que Facilitam a Gestão",
    excerpt: "Tecnologias que modernizam a comunicação e administração condominial.",
    content: "Apps de gestão facilitam avisos, reservas e pagamentos online...",
    author: "TI Especialista Rafael Tech",
    date: "2023-12-18",
    category: "Tecnologia",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop"
  },
  {
    id: 12,
    title: "Gestão de Funcionários no Condomínio: Boas Práticas",
    excerpt: "Como contratar, treinar e manter uma equipe eficiente e motivada.",
    content: "Investir no treinamento da equipe melhora a qualidade dos serviços...",
    author: "RH Consultora Isabel Ramos",
    date: "2023-12-15",
    category: "RH",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop"
  },
  {
    id: 13,
    title: "Mediação de Conflitos entre Condôminos",
    excerpt: "Técnicas para resolver disputas de forma pacífica e eficaz.",
    content: "A mediação evita desgastes e custos com processos judiciais...",
    author: "Mediador Dr. Antônio Paz",
    date: "2023-12-12",
    category: "Conflitos",
    image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=400&fit=crop"
  },
  {
    id: 14,
    title: "Auditoria Financeira em Condomínios: Quando e Como Fazer",
    excerpt: "A importância da transparência financeira para a confiança dos moradores.",
    content: "Auditorias anuais garantem a correta aplicação dos recursos...",
    author: "Contador João Silva",
    date: "2023-12-10",
    category: "Finanças",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop"
  },
  {
    id: 15,
    title: "Regulamento Interno: Como Criar e Atualizar",
    excerpt: "Diretrizes para estabelecer regras claras e justas para todos os moradores.",
    content: "O regulamento deve ser específico mas flexível às mudanças...",
    author: "Advogada Patrícia Lopes",
    date: "2023-12-08",
    category: "Regulamento",
    image: "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=800&h=400&fit=crop"
  },
  {
    id: 16,
    title: "Acessibilidade em Condomínios: Obrigações Legais",
    excerpt: "Adaptações necessárias para garantir o acesso de pessoas com deficiência.",
    content: "A lei exige rampas, elevadores adaptados e sinalizações adequadas...",
    author: "Arquiteta Inclusiva Maria José",
    date: "2023-12-05",
    category: "Acessibilidade",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop"
  },
  {
    id: 17,
    title: "Seguro Condominial: Coberturas Essenciais",
    excerpt: "Tipos de seguro que protegem o patrimônio e reduzem riscos financeiros.",
    content: "Seguro contra incêndio e responsabilidade civil são obrigatórios...",
    author: "Corretor Especialista Pedro Santos",
    date: "2023-12-03",
    category: "Seguros",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop"
  },
  {
    id: 18,
    title: "Animais de Estimação em Condomínios: Regras e Limites",
    excerpt: "Como estabelecer normas que respeitam os direitos de todos os moradores.",
    content: "As regras devem equilibrar bem-estar animal e convivência harmoniosa...",
    author: "Veterinária Dra. Carla Pet",
    date: "2023-12-01",
    category: "Convivência",
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=400&fit=crop"
  },
  {
    id: 19,
    title: "Comunicação Eficaz no Condomínio",
    excerpt: "Estratégias para manter os moradores sempre bem informados.",
    content: "Múltiplos canais de comunicação garantem que a informação chegue a todos...",
    author: "Comunicadora Social Rita Informa",
    date: "2023-11-28",
    category: "Comunicação",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop"
  },
  {
    id: 20,
    title: "Reserva de Emergência: Como Calcular e Manter",
    excerpt: "A importância de manter fundos para situações imprevistas no condomínio.",
    content: "Recomenda-se reservar 10% da receita mensal para emergências...",
    author: "Planejador Financeiro Carlos Money",
    date: "2023-11-25",
    category: "Finanças",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=400&fit=crop"
  },
  {
    id: 21,
    title: "Áreas de Lazer: Manutenção e Responsabilidades",
    excerpt: "Como manter piscinas, playgrounds e salões de festa em perfeito estado.",
    content: "Cronograma de limpeza e manutenção preventiva evita problemas maiores...",
    author: "Especialista em Lazer Bruno Diversão",
    date: "2023-11-22",
    category: "Lazer",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop"
  },
  {
    id: 22,
    title: "Terceirização de Serviços no Condomínio",
    excerpt: "Quando vale a pena terceirizar e como escolher fornecedores confiáveis.",
    content: "Limpeza, jardinagem e segurança são serviços comumente terceirizados...",
    author: "Consultor em Terceirização Luis Prático",
    date: "2023-11-20",
    category: "Terceirização",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop"
  },
  {
    id: 23,
    title: "Mudanças e Reformas: Protocolo para Moradores",
    excerpt: "Regras e procedimentos para mudanças e reformas internas nos apartamentos.",
    content: "Horários permitidos e cuidados com elevadores devem ser respeitados...",
    author: "Síndico Experiente Jorge Prático",
    date: "2023-11-18",
    category: "Reformas",
    image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop"
  },
  {
    id: 24,
    title: "Gestão de Resíduos: Coleta Seletiva Eficiente",
    excerpt: "Como implementar um sistema de reciclagem que funciona na prática.",
    content: "Educação ambiental dos moradores é fundamental para o sucesso...",
    author: "Ambientalista Verde Silva",
    date: "2023-11-15",
    category: "Meio Ambiente",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=400&fit=crop"
  },
  {
    id: 25,
    title: "Prestação de Contas: Transparência na Gestão",
    excerpt: "Modelos e ferramentas para apresentar as finanças de forma clara aos condôminos.",
    content: "Relatórios mensais detalhados fortalecem a confiança na administração...",
    author: "Contador Transparente Honesto Números",
    date: "2023-11-12",
    category: "Transparência",
    image: "https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&h=400&fit=crop"
  }
];

const News = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-6 py-24">
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-ffp-navy hover:text-ffp-gold transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Link>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-ffp-navy mb-4">
            Notícias sobre Gestão Condominial
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Mantenha-se atualizado com as últimas informações, dicas e mudanças 
            na legislação que afetam a gestão de condomínios.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsData.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default News;
