
import React from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  image: string;
}

interface NewsCardProps {
  article: Article;
}

const NewsCard = ({ article }: NewsCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 overflow-hidden">
      <div className="relative overflow-hidden">
        <img 
          src={article.image} 
          alt={article.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-ffp-gold text-ffp-navy px-3 py-1 rounded-full text-sm font-semibold">
            {article.category}
          </span>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <h3 className="text-lg font-bold text-ffp-navy line-clamp-2 group-hover:text-ffp-gold transition-colors">
          {article.title}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4">
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {article.excerpt}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            <span>{article.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDate(article.date)}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Link 
          to={`/noticias/${article.id}`}
          className="flex items-center text-ffp-navy hover:text-ffp-gold transition-colors text-sm font-semibold group"
        >
          Ler mais
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
