'use client';

import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  className?: string;
}

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      className={cn('shrink-0 bg-border-default', className)}
      {...props}
    >
      <SeparatorPrimitive.Separator className="h-full w-full" />
    </SeparatorPrimitive.Root>
  );
}

Separator.displayName = SeparatorPrimitive.Root.displayName;