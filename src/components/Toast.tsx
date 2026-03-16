import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ToastType } from '../hooks/useToast';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  index?: number;
}

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: '✨',
};

export default function Toast({ message, type = 'success', onClose, duration = 2500, index = 0 }: ToastProps) {
  // Auto-dismiss
  useEffect(() => {
    if (duration <= 0) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Minimal centered pill — tap anywhere to dismiss
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="fixed left-1/2 z-[100] pointer-events-auto"
      style={{
        bottom: `max(${1.5 + index * 2.75}rem, calc(env(safe-area-inset-bottom) + ${1.5 + index * 2.75}rem))`,
        transform: 'translateX(-50%)',
      }}
      onClick={onClose}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-2 rounded-full shadow-lg cursor-pointer select-none whitespace-nowrap"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1.5px solid var(--border-primary)',
          fontFamily: 'var(--title-font)',
          color: 'var(--text-body)',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        <span className="text-sm">{ICONS[type]}</span>
        {message}
      </div>
    </motion.div>
  );
}
