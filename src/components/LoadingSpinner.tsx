import { motion, useReducedMotion } from 'framer-motion';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({ fullScreen = true, className = '' }: LoadingSpinnerProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerClassName = [
    'flex flex-col items-center justify-center gap-3 text-center',
    fullScreen ? 'min-h-screen safe-area-top page-safe-bottom px-4' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName} role="status" aria-live="polite">
      <motion.div
        animate={{
          rotate: prefersReducedMotion ? 0 : 360,
        }}
        transition={{
          duration: 1,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: 'linear',
        }}
        className="w-12 h-12 border-4 rounded-full"
        style={{
          borderColor: 'var(--border-primary)',
          borderTopColor: 'var(--accent-primary)',
        }}
      />
      <p
        className="text-xs"
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--title-font)',
          animation: prefersReducedMotion ? 'none' : undefined,
        }}
      >
        ~ loading... ~
      </p>
    </div>
  );
}
