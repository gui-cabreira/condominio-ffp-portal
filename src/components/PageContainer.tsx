import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export function PageContainer({ children, className, fullHeight, noPadding }: PageContainerProps) {
  return (
    <div 
      className={cn(
        'w-full',
        !noPadding && 'p-4 md:p-6',
        fullHeight && 'h-[calc(100vh-4rem)]',
        className
      )}
    >
      <div className={cn(!fullHeight && 'max-w-7xl mx-auto space-y-6')}>
        {children}
      </div>
    </div>
  );
}
