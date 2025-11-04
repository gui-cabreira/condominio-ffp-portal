
import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      // If not on home page, navigate to home first
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${
      isScrolled ? 'bg-ffp-navy/95 backdrop-blur-md shadow-lg' : 'bg-ffp-navy'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center group">
            <div className="relative">
              {/* Brilho sutil e mais leve */}
              <div className="absolute inset-0 bg-ffp-gold/10 rounded-full blur-md group-hover:bg-ffp-gold/15 transition-all duration-1000 animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute -inset-1 bg-gradient-to-r from-ffp-gold/5 via-ffp-gold/10 to-ffp-gold/5 rounded-full blur-lg group-hover:from-ffp-gold/8 group-hover:via-ffp-gold/15 group-hover:to-ffp-gold/8 transition-all duration-1200" />
              <img 
                src="/lovable-uploads/33cfb7d4-6c60-414d-8f2b-599c21ac2ff4.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto relative z-10 group-hover:scale-102 transition-transform duration-500"
              />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('inicio')}
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Início</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>
            <button 
              onClick={() => scrollToSection('servicos')}
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Serviços</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>
            <button 
              onClick={() => scrollToSection('sobre')}
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Sobre</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>
            <Link 
              to="/noticias"
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Notícias</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </Link>
            <Link 
              to="/portal"
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Portal Corporativo</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </Link>
            <button 
              onClick={() => scrollToSection('contato')}
              className="text-white hover:text-ffp-gold transition-all duration-300 font-medium hover:scale-110 relative group"
            >
              <span className="relative z-10">Contato</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-ffp-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <a 
              href="https://wa.me/+5519999331777" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-white hover:text-ffp-gold transition-all duration-300 hover:scale-110 group"
            >
              <Phone size={16} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-sm font-medium">(19) 99933-1777</span>
            </a>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white transition-all duration-300 hover:scale-110 active:scale-95"
          >
            {isMobileMenuOpen ? <X size={24} className="animate-spin-slow" /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t animate-slide-in-top">
            <nav className="flex flex-col space-y-4 p-6">
              <button 
                onClick={() => scrollToSection('inicio')}
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
              >
                Início
              </button>
              <button 
                onClick={() => scrollToSection('servicos')}
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
              >
                Serviços
              </button>
              <button 
                onClick={() => scrollToSection('sobre')}
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
              >
                Sobre
              </button>
              <Link 
                to="/noticias"
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Notícias
              </Link>
              <Link 
                to="/portal"
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Portal Corporativo
              </Link>
              <button 
                onClick={() => scrollToSection('contato')}
                className="text-ffp-navy hover:text-ffp-gold transition-all duration-300 font-medium text-left hover:translate-x-2 hover:scale-105"
              >
                Contato
              </button>
              <div className="pt-4 border-t">
                <a 
                  href="https://wa.me/+5519999331777" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-ffp-navy hover:text-ffp-gold transition-all duration-300 hover:translate-x-2 hover:scale-105 group"
                >
                  <Phone size={16} className="group-hover:rotate-12 transition-transform duration-300" />
                  <span className="text-sm font-medium">(19) 99933-1777</span>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
