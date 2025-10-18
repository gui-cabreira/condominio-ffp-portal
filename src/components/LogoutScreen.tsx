import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { LogOut } from 'lucide-react';

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
        {/* Avatar com círculo elegante */}
        <div
          className={`relative transition-all duration-700 ${
            showContent
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75'
          }`}
        >
          {/* Outer glow - múltiplas camadas para efeito profundo */}
          <div className="absolute inset-0 -m-8">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-400/30 via-gray-200/40 to-gray-400/30 blur-2xl animate-pulse" />
          </div>
          <div className="absolute inset-0 -m-6">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-300/20 via-white/30 to-gray-300/20 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          {/* Anel externo prateado com gradiente */}
          <div className="relative p-1.5 rounded-full bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 shadow-2xl">
            {/* Anel intermediário dourado sutil */}
            <div className="p-0.5 rounded-full bg-gradient-to-br from-gray-200 via-white to-gray-200">
              {/* Anel interno escuro para contraste */}
              <div className="p-1.5 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
                {/* Avatar */}
                <Avatar className="h-32 w-32 border-[3px] border-gray-100/50 shadow-2xl ring-2 ring-white/20">
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={userName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 text-gray-800">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          
          {/* Ícone de logout flutuante */}
          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 via-white to-gray-300 shadow-lg flex items-center justify-center border-2 border-gray-800 animate-pulse">
            <LogOut className="w-6 h-6 text-gray-800" />
          </div>
        </div>

        {/* Mensagem de despedida */}
        <div className="text-center space-y-3 w-full">
          <h1
            className={`text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-200 via-white to-gray-200 bg-clip-text text-transparent transition-all duration-700 ${
              showContent
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            Até logo, {getFirstName(userName)}
          </h1>
          
          <p
            className={`text-lg text-gray-300 transition-all duration-700 ${
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
          <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
            Saindo com segurança...
          </div>
          <Progress value={progress} className="w-full h-2 bg-gray-800/50" />
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gray-300/30 rounded-full animate-pulse"
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
