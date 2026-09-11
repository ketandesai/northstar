'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'compact' | 'amber' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type HoverAccent = 'blue' | 'rose' | 'default';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  hoverAccent?: HoverAccent;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs hover:shadow active:scale-[0.98]',
  secondary:
    'bg-zinc-900 hover:bg-zinc-800 text-white font-medium dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs active:scale-[0.98]',
  outline:
    'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 font-medium active:scale-[0.98]',
  compact:
    'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 font-medium border border-blue-200 dark:border-blue-800/60 active:scale-[0.98]',
  amber:
    'bg-amber-200/80 dark:bg-amber-900/80 hover:bg-amber-300 text-amber-950 dark:text-amber-100 font-medium active:scale-[0.98]',
  ghost: 'bg-transparent text-zinc-400 font-medium',
};

const ghostAccentStyles: Record<HoverAccent, string> = {
  blue: 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  rose: 'hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  default: 'hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-lg',
  lg: 'p-2.5 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      hoverAccent = 'default',
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconOnly = !children && Boolean(icon);
    const sizeClass = isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];
    const variantClass = variantStyles[variant];
    const ghostClass = variant === 'ghost' ? ghostAccentStyles[hoverAccent] : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${variantClass} ${ghostClass} ${sizeClass} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
