
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
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/c5515a32-7de1-46ce-b62d-8d29f4750130.png" 
              alt="FFP Advogados" 
              className="h-10 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('inicio')}
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Início
            </button>
            <button 
              onClick={() => scrollToSection('servicos')}
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Serviços
            </button>
            <button 
              onClick={() => scrollToSection('sobre')}
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Sobre
            </button>
            <Link 
              to="/noticias"
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Notícias
            </Link>
            <Link 
              to="/portal"
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Portal Corporativo
            </Link>
            <button 
              onClick={() => scrollToSection('contato')}
              className="text-white hover:text-ffp-gold transition-colors font-medium"
            >
              Contato
            </button>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <a 
              href="https://wa.me/+5519999331777" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-white hover:text-ffp-gold transition-colors"
            >
              <Phone size={16} />
              <span className="text-sm font-medium">(19) 99933-1777</span>
            </a>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t">
            <nav className="flex flex-col space-y-4 p-6">
              <button 
                onClick={() => scrollToSection('inicio')}
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
              >
                Início
              </button>
              <button 
                onClick={() => scrollToSection('servicos')}
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
              >
                Serviços
              </button>
              <button 
                onClick={() => scrollToSection('sobre')}
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
              >
                Sobre
              </button>
              <Link 
                to="/noticias"
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Notícias
              </Link>
              <Link 
                to="/portal"
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Portal Corporativo
              </Link>
              <button 
                onClick={() => scrollToSection('contato')}
                className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium text-left"
              >
                Contato
              </button>
              <div className="pt-4 border-t">
                <a 
                  href="https://wa.me/+5519999331777" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-ffp-navy hover:text-ffp-gold transition-colors"
                >
                  <Phone size={16} />
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
