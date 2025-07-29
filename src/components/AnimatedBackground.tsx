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
    }, 6000); // Increased to 6 seconds for smoother viewing

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[8000ms] ease-in-out ${
            index === currentImageIndex 
              ? 'opacity-40 scale-110 rotate-1' 
              : index === (currentImageIndex - 1 + images.length) % images.length
                ? 'opacity-0 scale-100 rotate-0' 
                : 'opacity-0 scale-95 -rotate-1'
          }`}
          style={{
            backgroundImage: `url(${image})`,
            filter: 'blur(0.5px) brightness(0.7) contrast(1.1) saturate(1.1)',
            transformOrigin: 'center center',
          }}
        />
      ))}
      
      {/* Enhanced gradient overlay - stronger on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-white/20" />
      
      {/* Additional subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-ffp-navy/10 via-transparent to-ffp-gold/5" />
    </div>
  );
};

export default AnimatedBackground;