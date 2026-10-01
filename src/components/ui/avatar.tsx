'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  className?: string;
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Avatar({ className, name, src, size = 'md', ...props }: AvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
    '2xl': 'h-24 w-24 text-xl',
  };

  return (
    <AvatarPrimitive.Root className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full', className)} {...props}>
      {src ? (
        <AvatarPrimitive.Image
          className={cn('aspect-square h-full w-full object-cover', sizeClasses[size])}
          src={src}
          alt={name || 'Avatar'}
        />
      ) : (
        <AvatarPrimitive.Image
          className={cn('aspect-square h-full w-full object-cover', sizeClasses[size])}
          alt={name || 'Avatar'}
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-accent/20 text-accent font-medium',
          sizeClasses[size]
        )}
        delayMs={600}
      >
        {name ? getInitials(name) : '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}