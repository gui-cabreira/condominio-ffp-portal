
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 60); // Complete in 3 seconds (100 / 2 * 60ms = 3000ms)

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-ffp-navy z-50 flex items-center justify-center transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 bg-ffp-navy z-50 flex flex-col items-center justify-center">
      <div className="relative p-8 mb-8">
        <img 
          src="/lovable-uploads/c5515a32-7de1-46ce-b62d-8d29f4750130.png" 
          alt="FFP Advogados"
          className="w-80 h-auto animate-fade-in"
        />
      </div>
      
      {/* Progress Bar */}
      <div className="w-80 max-w-md">
        <div className="relative">
          <div className="w-full bg-ffp-navy-light/30 rounded-full h-1 mb-4">
            <div 
              className="bg-ffp-gold h-1 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-ffp-gold text-sm font-medium text-center animate-pulse">
            Carregando...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
