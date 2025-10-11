import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface LogoutScreenProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onComplete?: () => void;
}

export function LogoutScreen({ userName, userEmail, avatarUrl, onComplete }: LogoutScreenProps) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Mostrar conteúdo
    setTimeout(() => setShowContent(true), 200);

    // Simular progresso de logout
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    // Completar após 2 segundos
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ffp-navy">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-ffp-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-ffp-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8 px-4 max-w-md w-full">
        {/* Avatar */}
        <div
          className={`transition-all duration-700 ${
            showContent
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90'
          }`}
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 -m-4">
              <div className="w-full h-full rounded-full bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 blur-xl animate-pulse" />
            </div>
            
            {/* Avatar ring */}
            <div className="relative p-1 rounded-full bg-gradient-to-br from-primary via-accent to-primary">
              <div className="p-1 rounded-full bg-background">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>

        {/* Farewell message */}
        <div className="text-center space-y-3 w-full">
          <h1
            className={`text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent transition-all duration-700 ${
              showContent
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            Até logo, {getFirstName(userName)}
          </h1>
          
          <p
            className={`text-lg text-muted-foreground transition-all duration-700 ${
              showContent
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            {userEmail}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className={`w-full space-y-3 transition-all duration-700 ${
            showContent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Saindo com segurança...
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
