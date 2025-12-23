import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CorporateHeader } from '@/components/CorporateHeader';

interface CorporateLayoutProps {
  children: ReactNode;
}

export function CorporateLayout({ children }: CorporateLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CorporateHeader />
          <main className="flex-1 bg-gray-50 overflow-x-hidden">
            {children}
          </main>
          {/* Footer com crédito AppNow */}
          <footer className="bg-background border-t py-3 px-4 text-center text-xs text-muted-foreground">
            Desenvolvido por{' '}
            <a 
              href="https://appnow.com.br" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline font-medium"
            >
              AppNow
            </a>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
