/**
 * StyledEmoji — renders emoji as CDN images or native Unicode.
 *
 * Subscribes to the global emoji style via useEmojiStyle().
 * Falls back to native Unicode on image load error.
 * Use this anywhere you want theme-aware emoji rendering.
 */

import { useState, useEffect } from 'react';
import { useEmojiStyle, getStyledEmojiUrl } from '../../lib/emojiStyles';
import type { EmojiStyleId } from '../../lib/emojiStyles';

interface StyledEmojiProps {
  emoji: string;
  /** Image size in pixels (default: 20). Ignored for native style. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Override the global emoji style for previews */
  overrideStyle?: EmojiStyleId;
}

export default function StyledEmoji({
  emoji,
  size = 20,
  className = '',
  style: cssStyle,
  overrideStyle,
}: StyledEmojiProps) {
  const globalStyle = useEmojiStyle();
  const activeStyle = overrideStyle ?? globalStyle;
  const [imgError, setImgError] = useState(false);

  // Reset error state when style changes
  useEffect(() => {
    setImgError(false);
  }, [activeStyle, emoji]);

  const url = getStyledEmojiUrl(emoji, activeStyle);

  // Native style or fallback on image error
  if (!url || imgError) {
    return (
      <span className={className} style={cssStyle} role="img" aria-label={emoji}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...cssStyle,
      }}
      onError={() => setImgError(true)}
      loading="lazy"
      draggable={false}
    />
  );
}
