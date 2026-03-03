import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import StyledEmoji from './StyledEmoji';
import { useEmojiStyle } from '../../lib/emojiStyles';

export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😢', '✨', '👀'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

interface FloatingEmoji {
  id: number;
  emoji: string;
  offsetX: number;
}

interface ReactionBarProps {
  reactions: Record<string, number>;
  userReactions: string[];
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

let floatId = 0;

export default function ReactionBar({
  reactions,
  userReactions,
  onToggle,
  disabled = false,
}: ReactionBarProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  // Subscribe once at the bar level instead of per-emoji (6→1 subscriptions)
  const emojiStyle = useEmojiStyle();
  // Track active timers so we can clean them up on unmount
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      // Clear all pending float timers on unmount
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleToggle = useCallback(
    (emoji: string) => {
      if (disabled) return;
      onToggle(emoji);

      // Spawn floating emoji
      const id = ++floatId;
      const offsetX = (Math.random() - 0.5) * 20;
      setFloatingEmojis((prev) => [...prev, { id, emoji, offsetX }]);

      // Clean up after animation
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 850);
      timersRef.current.add(timer);
    },
    [onToggle, disabled],
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions[emoji] ?? 0;
        const isActive = userReactions.includes(emoji);

        return (
          <motion.button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => handleToggle(emoji)}
            whileTap={{ scale: 0.9 }}
            className={`relative inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs border transition-all min-h-[44px] lg:min-h-0 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{
              borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-primary)',
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--accent-primary) 20%, var(--card-bg))'
                : 'var(--card-bg)',
              boxShadow: isActive ? '0 1px 3px color-mix(in srgb, var(--accent-primary) 30%, transparent)' : 'none',
            }}
            aria-label={`${isActive ? 'Remove' : 'Add'} ${emoji} reaction`}
            aria-pressed={isActive}
          >
            <StyledEmoji emoji={emoji} size={18} overrideStyle={emojiStyle} />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 1.4, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              >
                {count}
              </motion.span>
            )}
          </motion.button>
        );
      })}

      {/* Floating emoji animations */}
      {floatingEmojis.map((f) => (
        <span
          key={f.id}
          className="emoji-float-up text-lg"
          style={{ left: `${f.offsetX + 20}px`, bottom: '100%' }}
        >
          <StyledEmoji emoji={f.emoji} size={24} overrideStyle={emojiStyle} />
        </span>
      ))}
    </div>
  );
}
