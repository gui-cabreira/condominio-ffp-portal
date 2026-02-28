import { useState, useEffect } from 'react';
import { User, LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDialog } from './ProfileDialog';
import { LogoutScreen } from './LogoutScreen';
import { NotificationBell } from './NotificationBell';
import { useNavigate } from 'react-router-dom';

export function CorporateHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [showLogoutScreen, setShowLogoutScreen] = useState(false);
  const [logoutInfo, setLogoutInfo] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setProfile(data);
  };

  const handleLogout = async () => {
    await signOut((userInfo) => {
      setLogoutInfo(userInfo);
      setShowLogoutScreen(true);
    });
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return user?.email || 'Usuário';
  };

  if (showLogoutScreen && logoutInfo) {
    return (
      <LogoutScreen
        userName={logoutInfo.userName}
        userEmail={logoutInfo.userEmail}
        avatarUrl={logoutInfo.avatarUrl}
      />
    );
  }

  return (
    <>
      <header className="h-16 border-b bg-white px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png"
            alt="FFP Advogados"
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-semibold text-ffp-navy hidden md:block">
            Sistema Corporativo
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-ffp-navy">
                <AvatarImage src={profile?.avatar_url} alt={getDisplayName()} />
                <AvatarFallback className="bg-ffp-navy text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Editar Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={profile}
        onProfileUpdate={loadProfile}
      />
    </>
  );
}
