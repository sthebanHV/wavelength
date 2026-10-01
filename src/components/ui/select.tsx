'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  dir?: 'ltr' | 'rtl';
}

export function Select({ children, ...props }: SelectProps) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
}

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-xl bg-bg-tertiary border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SelectPrimitive.Value placeholder={typeof children === 'string' ? children : ''} />
      <SelectPrimitive.Icon className="ml-2 h-4 w-4 text-text-muted transition-transform data-[state=open]:rotate-180">
        <ChevronDown />
      </SelectPrimitive.Icon>
      {children}
    </SelectPrimitive.Trigger>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  position?: 'popper' | 'item-aligned';
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
}

export function SelectContent({ className, position = 'popper', children, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-border-default bg-surface text-text-primary shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        {...props}
      >
        {children}
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

interface SelectItemProps {
  className?: string;
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default items-center py-2 px-3 text-sm outline-none transition-colors focus:bg-bg-hover focus:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-accent" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="ml-8">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

interface SelectValueProps {
  className?: string;
  placeholder?: React.ReactNode;
}

export function SelectValue({ className, ...props }: SelectValueProps) {
  return <SelectPrimitive.Value className={cn('', className)} {...props} />;
}

interface SelectGroupProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectGroup({ className, children, ...props }: SelectGroupProps) {
  return <SelectPrimitive.Group className={cn('', className)} {...props}>{children}</SelectPrimitive.Group>;
}

interface SelectLabelProps {
  className?: string;
  children: React.ReactNode;
}

export function SelectLabel({ className, children, ...props }: SelectLabelProps) {
  return <SelectPrimitive.Label className={cn('px-3 py-2 text-xs font-semibold text-text-muted', className)} {...props}>{children}</SelectPrimitive.Label>;
}

interface SelectSeparatorProps {
  className?: string;
}

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border-default', className)} {...props} />;
}

interface SelectScrollUpButtonProps {
  className?: string;
}

export function SelectScrollUpButton({ className, ...props }: SelectScrollUpButtonProps) {
  return (
    <SelectPrimitive.ScrollUpButton className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

interface SelectScrollDownButtonProps {
  className?: string;
}

export function SelectScrollDownButton({ className, ...props }: SelectScrollDownButtonProps) {
  return (
    <SelectPrimitive.ScrollDownButton className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}