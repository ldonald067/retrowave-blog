import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type CardVariant = 'info' | 'warning' | 'error' | 'success';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
}

export default function Card({ children, variant = 'info', className = '' }: CardProps) {
  const variantStyles: Record<CardVariant, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 border rounded-xl ${variantStyles[variant]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
