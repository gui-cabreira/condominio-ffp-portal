import { 
  Home, Building2, FileText, Users, Settings, LogOut, Menu, BarChart3, 
  Upload, UserPlus, Building, Server, MessageSquare, Cog, Headphones, 
  Workflow, TrendingUp, Shield, ChevronDown
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';

interface MenuCategory {
  label: string;
  icon: React.ElementType;
  items: {
    title: string;
    url: string;
    icon: React.ElementType;
  }[];
}

const menuCategories: MenuCategory[] = [
  {
    label: 'Operacional',
    icon: Building2,
    items: [
      { title: 'Dashboard', url: '/portal/corporativo/dashboard', icon: Home },
      { title: 'Condomínios', url: '/portal/corporativo/condominios', icon: Building2 },
      { title: 'Administradoras', url: '/portal/corporativo/administradoras', icon: Building },
      { title: 'Cobranças', url: '/portal/corporativo/cobrancas', icon: FileText },
      { title: 'Importar', url: '/portal/corporativo/importar', icon: Upload },
      { title: 'Cadastrar Inadimplente', url: '/portal/corporativo/cadastrar-inadimplente', icon: UserPlus },
    ]
  },
  {
    label: 'Atendimento',
    icon: Headphones,
    items: [
      { title: 'CRM Atendimento', url: '/portal/corporativo/atendimento', icon: MessageSquare },
      { title: 'Coach IA', url: '/portal/corporativo/coach-painel', icon: MessageSquare },
    ]
  },
  {
    label: 'Relatórios',
    icon: TrendingUp,
    items: [
      { title: 'Backoffice', url: '/portal/corporativo/backoffice', icon: BarChart3 },
      { title: 'Analytics', url: '/portal/corporativo/analytics', icon: TrendingUp },
      { title: 'Relatórios', url: '/portal/corporativo/relatorios', icon: FileText },
    ]
  },
  {
    label: 'Configurações',
    icon: Cog,
    items: [
      { title: 'Workflow', url: '/portal/corporativo/workflow', icon: Workflow },
      { title: 'Parâmetros', url: '/portal/corporativo/parametros', icon: Settings },
      { title: 'Automação', url: '/portal/corporativo/automacao', icon: Server },
    ]
  },
  {
    label: 'Administração',
    icon: Shield,
    items: [
      { title: 'Usuários', url: '/portal/corporativo/usuarios', icon: Users },
      { title: 'Aprovar Usuários', url: '/portal/corporativo/aprovar-usuarios', icon: UserPlus },
      { title: 'Sistema', url: '/portal/corporativo/sistema', icon: Server },
    ]
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';
  const [openCategories, setOpenCategories] = useState<string[]>(['Operacional']);

  const handleLogout = async () => {
    await signOut();
    navigate('/portal');
  };

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => 
      prev.includes(label) 
        ? prev.filter(c => c !== label) 
        : [...prev, label]
    );
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

      <SidebarContent className="overflow-y-auto">
        {menuCategories.map((category) => (
          <SidebarGroup key={category.label}>
            {collapsed ? (
              <SidebarGroupContent>
                <SidebarMenu>
                  {category.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                              isActive ? 'bg-ffp-navy text-white' : 'hover:bg-accent'
                            }`
                          }
                          title={item.title}
                        >
                          <item.icon className="h-5 w-5" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            ) : (
              <Collapsible
                open={openCategories.includes(category.label)}
                onOpenChange={() => toggleCategory(category.label)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent rounded-lg mx-2 my-1">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {category.label}
                      </span>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        openCategories.includes(category.label) ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {category.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 ml-4 rounded-lg transition-all duration-200 ${
                                  isActive
                                    ? 'bg-ffp-navy text-white'
                                    : 'hover:bg-accent'
                                }`
                              }
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            )}
          </SidebarGroup>
        ))}
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