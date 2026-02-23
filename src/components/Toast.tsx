import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ToastType } from '../hooks/useToast';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-4 right-4 z-[100] max-w-md"
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
          <div className="flex items-center gap-2">
            <span className="text-base">{icons[type]}</span>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
            >
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notification"
            className="p-1 rounded transition-colors hover:opacity-70 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
