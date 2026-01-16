import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/AppSidebar';
import { CorporateHeader } from '@/components/CorporateHeader';

interface CorporateLayoutProps {
  children: ReactNode;
}

export function CorporateLayout({ children }: CorporateLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <CorporateHeader />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              {children}
            </main>
            {/* Footer com crédito AppNow */}
            <footer className="bg-card border-t py-3 px-4 text-center text-xs text-muted-foreground">
              Desenvolvido por{' '}
              <a 
                href="https://appnow.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:text-secondary transition-colors font-medium"
              >
                AppNow
              </a>
            </footer>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
