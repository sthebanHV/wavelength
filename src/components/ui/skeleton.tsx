import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height, ...props }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-bg-tertiary via-bg-hover to-bg-tertiary bg-[length:200%_100%]',
        variantStyles[variant],
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

export function SkeletonTrack({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-3 rounded-xl', className)}>
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
      <Skeleton variant="text" width={50} height={20} />
    </div>
  );
}

export function SkeletonAlbum({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton variant="rectangular" className="aspect-square" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="50%" />
    </div>
  );
}

export function SkeletonPlaylist({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-4 p-3 rounded-xl', className)}>
      <Skeleton variant="rectangular" width={56} height={56} />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="50%" />
      </div>
    </div>
  );
}

export function SkeletonArtist({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton variant="circular" width={80} height={80} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}