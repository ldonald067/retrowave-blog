import { motion } from 'framer-motion';

interface EmptyStateProps {
  onCreatePost: () => void;
}

export default function EmptyState({ onCreatePost }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {/* Journal page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        className="xanga-box lined-paper p-6 sm:p-8 w-full max-w-lg"
      >
        {/* Journal header */}
        <div className="mb-4 pb-3 border-b-2 border-dotted" style={{ borderColor: 'var(--border-primary)' }}>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-3xl sm:text-4xl mb-2"
          >
            📓✨
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xanga-title text-lg sm:text-xl"
          >
            ~ your journal is empty ~
          </motion.h2>
        </div>

        {/* Fake journal entry area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-left mb-6"
        >
          <p
            className="text-xs mb-2 font-bold"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
          >
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
            every xanga needs a first entry...
            <br />
            what's on ur mind? 💭
          </p>
          <span className="typing-cursor mt-1" />
        </motion.div>

        {/* Decorative divider */}
        <motion.p
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-xs mb-4 text-center tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          · _ · _ · _ · ♡ · _ · _ · _ ·
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreatePost}
          className="xanga-button w-full py-3 text-sm"
        >
          ✏️ ~ write ur first entry ~
        </motion.button>
      </motion.div>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs mt-4"
        style={{ color: 'var(--text-muted)' }}
      >
        pro tip: u can add mood, music, & even youtube vids 2 ur posts ✨
      </motion.p>
    </motion.div>
  );
}
