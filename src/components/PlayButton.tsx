import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface PlayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export const PlayButton = forwardRef<HTMLButtonElement, PlayButtonProps>(
  ({ size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          flex items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-2
          text-white shadow-lg shadow-accent/30
          transition-all hover:scale-105 hover:shadow-xl hover:shadow-accent/40
          active:scale-95
          ${sizeClasses[size]} ${className}
        `}
        {...props}
      >
        {children || (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    );
  }
);

PlayButton.displayName = 'PlayButton';

export default PlayButton;