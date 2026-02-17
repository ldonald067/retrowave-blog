import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  onCreatePost: () => void;
}

export default function EmptyState({ onCreatePost }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <FileText size={80} className="text-[#ff00ff] mb-6" />
      </motion.div>

      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-[#00ffff] mb-4">
        No Posts Yet
      </h2>

      <p className="text-gray-400 mb-8 max-w-md">
        Start your retrowave journey by creating your first blog post. Share your thoughts, code,
        and creativity with the world.
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCreatePost}
        className="px-8 py-3 bg-gradient-to-r from-[#ff00ff] to-[#00ffff] text-white font-bold rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.5)] hover:shadow-[0_0_25px_rgba(255,0,255,0.8)] transition-all"
      >
        Create Your First Post
      </motion.button>
    </motion.div>
  );
}
