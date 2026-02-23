import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  // Primary uses the xanga-button class for consistent theming
  if (variant === 'primary') {
    return (
      <motion.button
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        className={`xanga-button ${sizeStyles[size]} ${widthStyle} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block">✦</span>
            {children}
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }

  // Other variants use inline CSS variables for themed styling
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`font-bold transition border-2 border-dotted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${widthStyle} ${className}`}
      style={{
        backgroundColor:
          variant === 'danger'
            ? 'color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg))'
            : variant === 'ghost'
              ? 'transparent'
              : 'var(--card-bg)',
        borderColor:
          variant === 'danger'
            ? 'var(--accent-secondary)'
            : variant === 'ghost'
              ? 'transparent'
              : 'var(--border-primary)',
        color:
          variant === 'danger'
            ? 'var(--accent-secondary)'
            : 'var(--text-body)',
        fontFamily: 'var(--title-font)',
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin inline-block">✦</span>
          {children}
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
