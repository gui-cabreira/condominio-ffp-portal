import { 
  Home, Building2, FileText, Users, Settings, LogOut, Menu, BarChart3, 
  Upload, UserPlus, Building, Server, MessageSquare, Cog, Headphones, 
  Workflow, TrendingUp, Shield, ChevronDown, Kanban
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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
      { title: 'CRM Pipeline', url: '/portal/corporativo/crm', icon: Kanban },
      { title: 'CRM Atendimento', url: '/portal/corporativo/atendimento', icon: MessageSquare },
      { title: 'WhatsApp IA', url: '/portal/corporativo/whatsapp', icon: MessageSquare },
      { title: 'Agentes Coach', url: '/portal/corporativo/coach', icon: MessageSquare },
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
  const location = useLocation();
  const collapsed = state === 'collapsed';
  
  // Determina quais categorias devem estar abertas baseado na rota atual
  const getInitialOpenCategories = () => {
    const currentPath = location.pathname;
    const openCats: string[] = [];
    menuCategories.forEach(cat => {
      if (cat.items.some(item => currentPath.startsWith(item.url))) {
        openCats.push(cat.label);
      }
    });
    return openCats.length > 0 ? openCats : ['Operacional'];
  };

  const [openCategories, setOpenCategories] = useState<string[]>(getInitialOpenCategories);

  useEffect(() => {
    const newOpen = getInitialOpenCategories();
    setOpenCategories(prev => [...new Set([...prev, ...newOpen])]);
  }, [location.pathname]);

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

  const isActiveRoute = (url: string) => location.pathname === url;

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-r-0 transition-all duration-300",
        "bg-sidebar text-sidebar-foreground"
      )}
    >
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sidebar-primary font-bold text-lg">F</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">FFP Advogados</span>
                <span className="text-xs text-sidebar-muted truncate">Sistema de Gestão</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-sidebar-primary font-bold text-lg">F</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-shrink-0",
              collapsed && "hidden"
            )}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="overflow-y-auto py-2">
        {menuCategories.map((category) => (
          <SidebarGroup key={category.label} className="px-2">
            {collapsed ? (
              /* Modo Colapsado - Apenas ícones com tooltips */
              <SidebarGroupContent className="space-y-1">
                <SidebarMenu>
                  {category.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={cn(
                                "flex items-center justify-center p-2.5 rounded-lg transition-all duration-200",
                                isActiveRoute(item.url)
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            ) : (
              /* Modo Expandido - Categorias colapsáveis */
              <Collapsible
                open={openCategories.includes(category.label)}
                onOpenChange={() => toggleCategory(category.label)}
              >
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent/50 group"
                  )}>
                    <div className="flex items-center gap-2.5">
                      <category.icon className="h-4 w-4 text-sidebar-muted" />
                      <span className="text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                        {category.label}
                      </span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 text-sidebar-muted transition-transform duration-200",
                        openCategories.includes(category.label) && "rotate-180"
                      )} 
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <SidebarGroupContent className="mt-1">
                    <SidebarMenu className="space-y-0.5">
                      {category.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 ml-2 rounded-lg transition-all duration-200",
                                isActiveRoute(item.url)
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-medium"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
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

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-sidebar-foreground/70 hover:bg-red-500/20 hover:text-red-400 transition-colors",
                collapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Sair</TooltipContent>
          )}
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
}