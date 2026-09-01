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

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 2500,
  index = 0,
}: ToastProps) {
  // Auto-dismiss
  useEffect(() => {
    if (duration <= 0) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Minimal centered pill — tap anywhere to dismiss.
  //
  // Centring lives on this outer element and animation on the inner one,
  // deliberately. They used to be the same element: `left-1/2` with an inline
  // `transform: translateX(-50%)`, on a motion.div whose `y`/`scale` Framer
  // also compiles into `transform`. Framer won, the -50% was dropped, and every
  // toast rendered starting at the horizontal centre and running off the right
  // edge — long messages were unreadable. One property, two writers, no owner.
  //
  // The wrapper also takes `px-4` and the pill a max-width, so a long message
  // wraps inside the viewport instead of reaching the edges.
  return (
    <div
      className="fixed inset-x-0 z-[100] flex justify-center px-4 pointer-events-none"
      style={{
        bottom: `max(calc(var(--toast-bottom-base) + ${index * 2.75}rem), calc(env(safe-area-inset-bottom) + var(--toast-bottom-base) + ${index * 2.75}rem))`,
      }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg shadow-lg cursor-pointer select-none text-center break-words max-w-sm pointer-events-auto"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1.5px solid var(--border-primary)',
          fontFamily: 'var(--title-font)',
          color: 'var(--text-body)',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
        onClick={onClose}
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
      >
        <span className="text-sm flex-shrink-0">{ICONS[type]}</span>
        <span>{message}</span>
      </motion.div>
    </div>
  );
}
