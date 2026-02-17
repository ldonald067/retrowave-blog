import { motion } from 'framer-motion';

export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😢', '✨', '👀'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

interface ReactionBarProps {
  reactions: Record<string, number>;
  userReactions: string[];
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

export default function ReactionBar({
  reactions,
  userReactions,
  onToggle,
  disabled = false,
}: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions[emoji] ?? 0;
        const isActive = userReactions.includes(emoji);

        return (
          <motion.button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(emoji)}
            whileTap={{ scale: 0.9 }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
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
    </div>
  );
}
