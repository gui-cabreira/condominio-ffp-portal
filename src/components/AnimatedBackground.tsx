import React, { useState, useEffect } from 'react';
import condo1 from '../assets/condo1.jpg';
import condo2 from '../assets/condo2.jpg';
import condo3 from '../assets/condo3.jpg';
import bg1 from '../assets/bg1.jpg';
import bg2 from '../assets/bg2.jpg';
import bg3 from '../assets/bg3.jpg';
import bg4 from '../assets/bg4.jpg';

const AnimatedBackground = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [condo1, condo2, condo3, bg1, bg2, bg3, bg4];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 12000); // Troca mais lenta - 12 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[10000ms] ease-in-out ${
            index === currentImageIndex 
              ? 'opacity-50 scale-110 animate-zoom-in-out' 
              : index === (currentImageIndex - 1 + images.length) % images.length
                ? 'opacity-0 scale-100' 
                : 'opacity-0 scale-95'
          }`}
          style={{
            backgroundImage: `url(${image})`,
            filter: 'blur(0.5px) brightness(0.8) contrast(1.2) saturate(1.2)',
            transformOrigin: 'center center',
            animation: index === currentImageIndex ? 'zoom-in-out 12s ease-in-out infinite' : 'none',
          }}
        />
      ))}
      
      {/* Degradê da esquerda para direita - mais sólido na esquerda, mais claro na direita */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-white/85 via-white/60 to-white/15" />
      
      {/* Additional subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/10 via-transparent to-ffp-gold/5" />
    </div>
  );
};

export default AnimatedBackground;