import { motion, useReducedMotion } from 'framer-motion';

export default function LoadingSpinner() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
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
