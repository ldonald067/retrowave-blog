import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
      >
        <AlertCircle size={80} className="text-[#ff00ff] mb-6" />
      </motion.div>

      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-[#00ffff] mb-4">
        Oops! Something went wrong
      </h2>

      <p className="text-gray-400 mb-2 max-w-md font-mono text-sm">Error:</p>
      <p className="text-red-400 mb-8 max-w-md">{error}</p>

      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-white font-bold rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.5)] hover:shadow-[0_0_25px_rgba(255,0,255,0.8)] transition-all"
        >
          <RefreshCw size={20} />
          <span>Try Again</span>
        </motion.button>
      )}
    </motion.div>
  );
}
