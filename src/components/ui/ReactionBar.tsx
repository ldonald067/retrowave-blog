import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

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

  const handleToggle = useCallback(
    (emoji: string) => {
      onToggle(emoji);

      // Spawn floating emoji
      const id = ++floatId;
      const offsetX = (Math.random() - 0.5) * 20;
      setFloatingEmojis((prev) => [...prev, { id, emoji, offsetX }]);

      // Clean up after animation
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 850);
    },
    [onToggle],
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
            className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
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
            <span className="text-sm">{emoji}</span>
            {count > 0 && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              >
                {count}
              </span>
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
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
