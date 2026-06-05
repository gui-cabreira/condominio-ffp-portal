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
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
