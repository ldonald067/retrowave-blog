import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { ToastType } from '../hooks/useToast';
import { SWIPE_DISMISS_THRESHOLD } from '../lib/constants';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  index?: number;
}

/** Color accents per toast type — used for left strip + progress bar */
const TYPE_COLORS: Record<ToastType, string> = {
  success: 'var(--accent-primary)',
  error: 'var(--accent-secondary)',
  info: 'var(--border-accent, var(--accent-primary))',
};

export default function Toast({ message, type = 'success', onClose, duration = 3000, index = 0 }: ToastProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0]);

  // Auto-dismiss timer + progress bar animation
  useEffect(() => {
    if (duration <= 0) return undefined;

    const timer = setTimeout(onClose, duration);

    // Animate progress bar width from 100% → 0%
    if (progressRef.current) {
      progressRef.current.style.transition = 'none';
      progressRef.current.style.width = '100%';
      // Force reflow to reset the transition
      void progressRef.current.offsetWidth;
      progressRef.current.style.transition = `width ${duration}ms linear`;
      progressRef.current.style.width = '0%';
    }

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons: Record<ToastType, ReactNode> = {
    success: <span>✅</span>,
    error: <span>❌</span>,
    info: <span>✨</span>,
  };

  const accentColor = TYPE_COLORS[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, x: 40 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.25, ease: 'easeIn' } }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 28,
        mass: 0.8,
      }}
      className="fixed right-4 left-4 sm:left-auto z-[100] max-w-md"
      style={{ top: `${1 + index * 4.5}rem`, x, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.05, right: 0.4 }}
      onDragEnd={(_e, info) => {
        if (info.offset.x > SWIPE_DISMISS_THRESHOLD || info.velocity.x > 300) {
          // Fling out and dismiss
          void animate(x, 400, { type: 'spring', stiffness: 300, damping: 30 });
          setTimeout(onClose, 200);
        } else {
          // Snap back
          void animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        }
      }}
    >
      <div
        role="alert"
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        className="xanga-box flex items-center justify-between gap-3 px-4 py-3 overflow-hidden"
        style={{
          borderColor: accentColor,
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid',
        }}
      >
        {/* Icon with pop entrance */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 15,
              delay: 0.15,
            }}
            className="text-base flex-shrink-0"
          >
            {icons[type]}
          </motion.span>
          <p
            className="text-sm font-bold truncate"
            style={{ color: 'var(--text-body)', fontFamily: 'var(--title-font)' }}
          >
            {message}
          </p>
        </div>

        {/* Close button with hover rotation */}
        <motion.button
          onClick={onClose}
          aria-label="Close notification"
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors hover:opacity-70 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </motion.button>

        {/* Progress bar — shrinks from right to left */}
        {duration > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}
          >
            <div
              ref={progressRef}
              className="h-full"
              style={{
                backgroundColor: accentColor,
                opacity: 0.6,
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
