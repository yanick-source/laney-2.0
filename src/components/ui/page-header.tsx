import React from 'react';
import { LaneyLogo } from './laney-logo';

interface PageHeaderProps {
  className?: string;
}

export function PageHeader({ className = '' }: PageHeaderProps) {
  return (
    <header className={`sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-sm border-b border-border/60 flex items-center px-6 ${className}`}>
      <LaneyLogo size="md" />
    </header>
  );
}

export default PageHeader;
