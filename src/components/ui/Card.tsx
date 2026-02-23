import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type CardVariant = 'info' | 'warning' | 'error' | 'success';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
}

export default function Card({ children, variant = 'info', className = '' }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`xanga-box p-3 ${className}`}
      style={{
        borderColor:
          variant === 'error'
            ? 'var(--accent-secondary)'
            : variant === 'success'
              ? 'var(--accent-primary)'
              : 'var(--border-primary)',
      }}
    >
      {children}
    </motion.div>
  );
}
