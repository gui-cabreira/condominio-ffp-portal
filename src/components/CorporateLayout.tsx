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
        </div>
      </div>
    </SidebarProvider>
  );
}
