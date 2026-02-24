import { motion } from 'framer-motion';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="w-12 h-12 border-4 rounded-full"
        style={{
          borderColor: 'var(--border-primary)',
          borderTopColor: 'var(--accent-primary)',
        }}
      />
      <p
        className="text-xs animate-pulse"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
      >
        ~ loading... ~
      </p>
    </div>
  );
}
