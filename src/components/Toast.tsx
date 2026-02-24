import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { ToastType } from '../hooks/useToast';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  index?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000, index = 0 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const icons: Record<ToastType, ReactNode> = {
    success: <span>✅</span>,
    error: <span>❌</span>,
    info: <span>✨</span>,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed right-4 left-4 sm:left-auto z-[100] max-w-md"
      style={{ top: `${1 + index * 4.5}rem` }}
    >
      <div
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        className="xanga-box flex items-center justify-between gap-3 px-4 py-3"
        style={{
          borderColor:
            type === 'error'
              ? 'var(--accent-secondary)'
              : type === 'success'
                ? 'var(--accent-primary)'
                : 'var(--border-primary)',
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base flex-shrink-0">{icons[type]}</span>
          <p
            className="text-sm font-bold truncate"
            style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
          >
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors hover:opacity-70 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
