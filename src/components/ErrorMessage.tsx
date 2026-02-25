import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6"
    >
      <motion.div
        animate={{
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: 3,
        }}
        className="text-5xl mb-4"
      >
        😵‍💫
      </motion.div>

      <div className="xanga-box p-6 max-w-md w-full mb-6">
        <h2 className="xanga-title text-xl mb-3">
          ~ oops! something went wrong ~
        </h2>

        <div
          className="xanga-box p-3 mb-4 text-left"
          style={{ borderColor: 'var(--accent-secondary)' }}
        >
          <p
            className="text-xs font-bold mb-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
          >
            error:
          </p>
          <p className="text-sm" style={{ color: 'var(--accent-secondary)' }}>
            {error}
          </p>
        </div>

        {onRetry && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRetry}
            className="xanga-button w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            ~ try again ~
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
