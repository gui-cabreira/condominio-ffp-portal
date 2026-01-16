import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, UserCog, ArrowRight } from 'lucide-react';
import { ProfileDialog } from '@/components/ProfileDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [showActions, setShowActions] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const logoTimer = setTimeout(() => setShowLogo(true), 200);
    const avatarTimer = setTimeout(() => setShowAvatar(true), 600);
    const greetingTimer = setTimeout(() => setShowGreeting(true), 1000);
    const subtextTimer = setTimeout(() => setShowSubtext(true), 1400);
    const actionsTimer = setTimeout(() => setShowActions(true), 1800);
    
    const completeTimer = setTimeout(() => {
      if (autoRedirect) {
        if (onComplete) {
          onComplete();
        } else {
          navigate('/portal/corporativo/dashboard');
        }
      }
    }, 4500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(avatarTimer);
      clearTimeout(greetingTimer);
      clearTimeout(subtextTimer);
      clearTimeout(actionsTimer);
      clearTimeout(completeTimer);
    };
  }, [navigate, onComplete, autoRedirect]);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setAutoRedirect(false);
    setLoggingOut(true);
    
    // Animação de fade out
    setShowActions(false);
    setShowSubtext(false);
    setShowGreeting(false);
    setShowAvatar(false);
    setShowLogo(false);
    
    // Aguardar animação antes de fazer logout
    setTimeout(async () => {
      await signOut();
      toast.success('Até logo!', {
        description: 'Você foi desconectado com sucesso.',
      });
    }, 700);
  };

  const handleManageProfile = () => {
    setAutoRedirect(false);
    setShowProfileDialog(true);
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/portal/corporativo/dashboard');
    }
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-ffp-navy transition-opacity duration-700 ${
      loggingOut ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-ffp-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-ffp-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Logout overlay */}
      {loggingOut && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ffp-navy/95 backdrop-blur-sm">
          <div className="text-center space-y-4 animate-in fade-in duration-500">
            <LogOut className="h-16 w-16 text-ffp-gold mx-auto animate-pulse" />
            <p className="text-2xl text-white font-semibold">Até logo!</p>
            <p className="text-ffp-gold">Encerrando sessão...</p>
          </div>
        </div>
      )}

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
        <div className="text-center space-y-3">
          <h1
            className={`text-4xl md:text-5xl font-bold text-white transition-all duration-700 drop-shadow-lg ${
              showGreeting
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            Bem-vindo de volta, <span className="text-ffp-gold">{getFirstName(userName)}</span>
          </h1>
          
          <p
            className={`text-lg text-white/90 font-medium transition-all duration-700 ${
              showSubtext
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            {userEmail}
          </p>
        </div>

        {/* Loading indicator ou Action buttons */}
        {showActions ? (
          <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 ${
            showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-ffp-gold to-ffp-gold-light hover:from-ffp-gold-light hover:to-ffp-gold text-ffp-navy font-semibold px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all"
            >
              Continuar para o Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button
              onClick={handleManageProfile}
              variant="outline"
              className="border-2 border-ffp-gold text-ffp-gold hover:bg-ffp-gold hover:text-ffp-navy font-semibold px-6 py-6 rounded-full shadow-xl transition-all"
            >
              <UserCog className="mr-2 h-5 w-5" />
              Gerenciar Perfil
            </Button>
            
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="ghost"
              className="border-2 border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/40 font-semibold px-6 py-6 rounded-full shadow-xl transition-all backdrop-blur-sm"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair
            </Button>
          </div>
        ) : (
          <div className={`flex space-x-2 transition-all duration-700 ${
            showSubtext ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-ffp-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

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

      {/* Profile Dialog */}
      {userProfile && (
        <ProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          profile={userProfile}
          onProfileUpdate={async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user?.id)
              .single();
            setUserProfile(data);
          }}
        />
      )}
    </div>
  );
}
