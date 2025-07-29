import React, { useState, useEffect } from 'react';
import condo1 from '../assets/condo1.jpg';
import condo2 from '../assets/condo2.jpg';
import condo3 from '../assets/condo3.jpg';

const AnimatedBackground = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [condo1, condo2, condo3];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-3000 ease-in-out ${
            index === currentImageIndex ? 'opacity-20 scale-105' : 'opacity-0 scale-100'
          }`}
          style={{
            backgroundImage: `url(${image})`,
            filter: 'blur(0.5px) brightness(0.8) contrast(1.1)',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
};

export default AnimatedBackground;