
import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail } from 'lucide-react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
              alt="FFP Advogados" 
              className="h-12 w-auto"
            />
            <div className="hidden md:block">
              <h1 className="font-playfair text-xl font-bold text-ffp-navy">FFP Advogados</h1>
              <p className="text-sm text-ffp-gold font-medium">Direito Condominial</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('inicio')}
              className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium"
            >
              Início
            </button>
            <button 
              onClick={() => scrollToSection('servicos')}
              className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium"
            >
              Serviços
            </button>
            <button 
              onClick={() => scrollToSection('sobre')}
              className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium"
            >
              Sobre
            </button>
            <button 
              onClick={() => scrollToSection('contato')}
              className="text-ffp-navy hover:text-ffp-gold transition-colors font-medium"
            >
              Contato
            </button>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
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

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-ffp-navy"
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
