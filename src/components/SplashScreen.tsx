
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
          src="/lovable-uploads/c5515a32-7de1-46ce-b62d-8d29f4750130.png" 
          alt="FFP Advogados"
          className="w-96 h-auto animate-fade-in"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
