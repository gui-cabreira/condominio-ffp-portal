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
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-2000 ${
            index === currentImageIndex ? 'opacity-30' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${image})`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white/90" />
    </div>
  );
};

export default AnimatedBackground;