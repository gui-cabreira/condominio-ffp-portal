import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  noPadding?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function PageContainer({ 
  children, 
  className, 
  fullHeight, 
  noPadding,
  maxWidth = '7xl'
}: PageContainerProps) {
  return (
    <div 
      className={cn(
        'w-full animate-fade-in',
        !noPadding && 'p-4 md:p-6 lg:p-8',
        fullHeight && 'min-h-[calc(100vh-4rem)]',
        className
      )}
    >
      <div className={cn(
        'mx-auto',
        maxWidthClasses[maxWidth],
        !fullHeight && 'space-y-6'
      )}>
        {children}
      </div>
    </div>
  );
}
