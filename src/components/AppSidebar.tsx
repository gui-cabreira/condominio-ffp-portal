import { Home, Building2, FileText, Users, Settings, LogOut, Menu, BarChart3, Upload, UserPlus, Building } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/portal/corporativo/dashboard',
    icon: Home,
  },
  {
    title: 'Condomínios',
    url: '/portal/corporativo/condominios',
    icon: Building2,
  },
  {
    title: 'Administradoras',
    url: '/portal/corporativo/administradoras',
    icon: Building,
  },
  {
    title: 'Cobranças',
    url: '/portal/corporativo/cobrancas',
    icon: FileText,
  },
  {
    title: 'Backoffice',
    url: '/portal/corporativo/backoffice',
    icon: BarChart3,
  },
  {
    title: 'Usuários',
    url: '/portal/corporativo/usuarios',
    icon: Users,
  },
  {
    title: 'Importar',
    url: '/portal/corporativo/importar',
    icon: Upload,
  },
  {
    title: 'Cadastrar Inadimplente',
    url: '/portal/corporativo/cadastrar-inadimplente',
    icon: UserPlus,
  },
  {
    title: 'Workflow',
    url: '/portal/corporativo/workflow',
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const handleLogout = async () => {
    await signOut();
    navigate('/portal');
  };

  return (
    <Sidebar className={`border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <img 
              src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png"
              alt="FFP Advogados"
              className="h-8 w-auto"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-ffp-navy text-white'
                            : 'hover:bg-accent'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
