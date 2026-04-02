import React from 'react';

interface LaneyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LaneyLogo({ size = 'md', className = '' }: LaneyLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-24 w-auto',
    lg: 'h-32 w-auto'
  };

  return (
    <img
      src="/laney-logo.png"
      alt="Laney"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}

export default LaneyLogo;
