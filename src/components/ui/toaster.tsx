'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  className?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

export function Toast({ className, variant = 'default', ...props }: ToastProps) {
  const variantStyles = {
    default: 'border-border-default',
    success: 'border-success/50 bg-success/10',
    error: 'border-error/50 bg-error/10',
    warning: 'border-warning/50 bg-warning/10',
  };

  return (
    <ToastPrimitive.Root
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="grid gap-1">
        <ToastPrimitive.Title className="text-sm font-medium text-text-primary" />
        <ToastPrimitive.Description className="text-sm opacity-90 text-text-secondary" />
      </div>
      <ToastPrimitive.Close className="absolute right-2 top-2 rounded-lg p-1 text-text-muted/50 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

interface ToastActionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> {
  className?: string;
}

export function ToastAction({ className, ...props }: ToastActionProps) {
  return (
    <ToastPrimitive.Action
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

interface ToastCloseProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close> {
  className?: string;
}

export function ToastClose({ className, ...props }: ToastCloseProps) {
  return (
    <ToastPrimitive.Close
      className={cn(
        'absolute right-2 top-2 rounded-lg p-1 text-text-muted/50 hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitive.Close>
  );
}

interface ToastTitleProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title> {
  className?: string;
}

export function ToastTitle({ className, ...props }: ToastTitleProps) {
  return <ToastPrimitive.Title className={cn('', className)} {...props} />;
}

interface ToastDescriptionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description> {
  className?: string;
}

export function ToastDescription({ className, ...props }: ToastDescriptionProps) {
  return <ToastPrimitive.Description className={cn('', className)} {...props} />;
}

interface ToastViewportProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> {
  className?: string;
}

export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 overflow-y-auto p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
        className
      )}
      {...props}
    />
  );
}

export function Toaster({ position = 'bottom-right' }: { position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' }) {
  const positionClasses = {
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
  };

  return (
    <ToastPrimitive.Provider>
      <ToastViewport className={positionClasses[position]} />
    </ToastPrimitive.Provider>
  );
}

export function toast({
  title,
  description,
  variant = 'default',
  // action,
  // duration = 5000,
}: {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  // action?: React.ReactNode;
  // duration?: number;
}) {
  // This is a simplified version - in a real app you'd use a toast library like sonner
  console.log(`Toast [${variant}]: ${title} - ${description}`);
}