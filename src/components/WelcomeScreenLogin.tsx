import React, { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface WelcomeScreenLoginProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onComplete: () => void;
}

const WelcomeScreenLogin = ({ userName, userEmail, avatarUrl, onComplete }: WelcomeScreenLoginProps) => {
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
        return prev + 4; // Faster than splash screen
      });
    }, 40); // Complete in 1 second

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-ffp-navy z-50 flex items-center justify-center transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 bg-ffp-navy z-50 flex flex-col items-center justify-center">
      {/* Avatar */}
      <div className="mb-6 animate-fade-in">
        <Avatar className="w-32 h-32 border-4 border-ffp-gold shadow-2xl">
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="bg-ffp-gold text-ffp-navy text-3xl font-bold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Welcome Message */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-2">
          Bem-vindo, {getFirstName(userName)}!
        </h1>
        <p className="text-ffp-gold text-lg">
          {userEmail}
        </p>
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
            Carregando seu ambiente...
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreenLogin;
