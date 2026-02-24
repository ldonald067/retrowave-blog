import { motion } from 'framer-motion';

interface EmptyStateProps {
  onCreatePost: () => void;
}

export default function EmptyState({ onCreatePost }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {/* Journal page */}
      <div className="xanga-box lined-paper p-6 sm:p-8 w-full max-w-lg">
        {/* Journal header */}
        <div className="mb-4 pb-3 border-b-2 border-dotted" style={{ borderColor: 'var(--border-primary)' }}>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-3xl sm:text-4xl mb-2"
          >
            📓✨
          </motion.div>
          <h2 className="xanga-title text-lg sm:text-xl">
            ~ your journal is empty ~
          </h2>
        </div>

        {/* Fake journal entry area */}
        <div className="text-left mb-6">
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
        </div>

        {/* Decorative divider */}
        <p
          className="text-xs mb-4 text-center tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          · _ · _ · _ · ♡ · _ · _ · _ ·
        </p>

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreatePost}
          className="xanga-button w-full py-3 text-sm"
        >
          ✏️ ~ write ur first entry ~
        </motion.button>
      </div>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs mt-4"
        style={{ color: 'var(--text-muted)' }}
      >
        pro tip: u can add mood, music, & even youtube vids 2 ur posts ✨
      </motion.p>
    </motion.div>
  );
}
