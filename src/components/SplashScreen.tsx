
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
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-ffp-gold/10 to-ffp-navy/10 rounded-full blur-xl animate-pulse" />
        <img 
          src="/lovable-uploads/51d17d9a-87dc-4294-a89e-d45f9db1b00f.png" 
          alt="FFP Advogados"
          className="w-96 h-auto animate-logo-glow"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
