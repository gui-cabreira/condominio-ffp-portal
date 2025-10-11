import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface WelcomeLoginProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onComplete?: () => void;
}

export function WelcomeLogin({ userName, userEmail, avatarUrl, onComplete }: WelcomeLoginProps) {
  const [showLogo, setShowLogo] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const logoTimer = setTimeout(() => setShowLogo(true), 200);
    const avatarTimer = setTimeout(() => setShowAvatar(true), 600);
    const greetingTimer = setTimeout(() => setShowGreeting(true), 1000);
    const subtextTimer = setTimeout(() => setShowSubtext(true), 1400);
    
    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        navigate('/portal/corporativo/dashboard');
      }
    }, 3500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(avatarTimer);
      clearTimeout(greetingTimer);
      clearTimeout(subtextTimer);
      clearTimeout(completeTimer);
    };
  }, [navigate, onComplete]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ffp-navy">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-ffp-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-ffp-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8 px-4">
        {/* Logo */}
        <div
          className={`transition-all duration-700 ${
            showLogo
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-8 scale-90'
          }`}
        >
          <img
            src="/lovable-uploads/33cfb7d4-6c60-414d-8f2b-599c21ac2ff4.png"
            alt="FFP Advogados"
            className="h-16 w-auto drop-shadow-2xl"
          />
        </div>

        {/* Avatar with glow */}
        <div
          className={`relative transition-all duration-700 ${
            showAvatar
              ? 'opacity-100 translate-y-0 scale-100 animate-bounce'
              : 'opacity-0 translate-y-8 scale-50'
          }`}
          style={{
            animationDuration: showAvatar ? '1s' : '0s',
            animationIterationCount: showAvatar ? '3' : '0'
          }}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 -m-4">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-ffp-gold/60 via-white/40 to-ffp-gold/60 blur-xl animate-pulse" />
          </div>
          
          {/* Avatar ring */}
          <div className="relative p-1 rounded-full bg-gradient-to-br from-ffp-gold via-white to-ffp-gold">
            <div className="p-1 rounded-full bg-ffp-navy">
              <Avatar className="h-32 w-32 border-4 border-ffp-navy shadow-2xl">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-ffp-gold to-ffp-gold-light text-ffp-navy">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="text-center space-y-2">
          <h1
            className={`text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-ffp-gold to-white bg-clip-text text-transparent transition-all duration-700 ${
              showGreeting
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            Bem-vindo de volta, {getFirstName(userName)}
          </h1>
          
          <p
            className={`text-lg text-ffp-gold transition-all duration-700 ${
              showSubtext
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            {userEmail}
          </p>
        </div>

        {/* Loading indicator */}
        <div
          className={`flex space-x-2 transition-all duration-700 ${
            showSubtext
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-ffp-gold/30 rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
