
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-ffp-navy z-50 flex items-center justify-center transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 bg-ffp-navy z-50 flex items-center justify-center">
      <div className="relative p-8">
        <img 
          src="/lovable-uploads/1b1a978c-89e0-4816-b68e-de6446f18cd1.png" 
          alt="FFP Advogados"
          className="w-96 h-auto animate-fade-in"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
