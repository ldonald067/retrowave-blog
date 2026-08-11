import { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, ExternalLink } from 'lucide-react';
import { openUrl } from '../../lib/capacitor';
import type { YouTubeInfoWithTitle } from '../../hooks/useYouTubeInfo';

interface YouTubeCardProps {
  /** Parsed YouTube info from useYouTubeInfo hook */
  ytInfo: YouTubeInfoWithTitle;
  /** 'sm' = sidebar (compact), 'md' = feed card / modal (standard) */
  size?: 'sm' | 'md';
  /** Use Capacitor openUrl for SFSafariViewController on iOS (default: true) */
  useNativeOpen?: boolean;
}

// Size presets — thumbnail, text, and icon sizes.
//
// Text sizes are rem, never arbitrary px: Tailwind emits `text-[10px]` as
// literal px, which ignores the root scaling that carries Dynamic Type (see
// lib/dynamic-type.ts). Named steps where one fits, arbitrary rem otherwise.
//
// Nothing here goes below 0.6875rem (11px). `badge` used to be 8px in the sm
// preset, which is under every published floor — and it is not only the
// decorative "YouTube" label: it also renders "Loading title...", so a reader
// waiting on a slow oembed call was the one person guaranteed to need it. Both
// presets keep title one step above badge so the hierarchy survives the bump.
const SIZES = {
  sm: {
    thumb: 'w-14 h-10',
    title: 'text-xs leading-tight',
    badge: 'text-[0.6875rem]',
    ytIcon: 8,
    extIcon: 6,
    gap: 'gap-2',
    pad: 'p-1.5',
    layout: 'items-start',
  },
  md: {
    thumb: 'w-20 h-14',
    title: 'text-sm',
    badge: 'text-[0.6875rem]',
    ytIcon: 12,
    extIcon: 8,
    gap: 'gap-3',
    pad: 'p-2',
    layout: 'items-center',
  },
} as const;

/**
 * Shared YouTube preview card.
 *
 * Used by PostCard (feed), Sidebar (profile), and PostModal (view mode).
 * Centralizes the thumbnail + title + YouTube badge layout so changes
 * only need to happen in one place.
 */
export default function YouTubeCard({
  ytInfo,
  size = 'md',
  useNativeOpen = true,
}: YouTubeCardProps) {
  const s = SIZES[size];
  const [thumbError, setThumbError] = useState(false);

  return (
    <motion.a
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      href={ytInfo.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={
        useNativeOpen
          ? (e: React.MouseEvent) => {
              e.preventDefault();
              void openUrl(ytInfo.watchUrl);
            }
          : undefined
      }
      className={`flex ${s.layout} ${s.gap} ${s.pad} rounded transition`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 15%, var(--card-bg))',
      }}
    >
      {thumbError ? (
        <div
          className={`${s.thumb} rounded flex-shrink-0 flex items-center justify-center`}
          style={{
            border: '1px solid var(--border-primary)',
            backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 20%, var(--card-bg))',
          }}
        >
          <Youtube size={s.ytIcon * 2} style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
        </div>
      ) : (
        <img
          src={ytInfo.thumbnailUrl}
          alt={ytInfo.title || 'YouTube thumbnail'}
          loading="lazy"
          className={`${s.thumb} object-cover rounded flex-shrink-0`}
          style={{ border: '1px solid var(--border-primary)' }}
          onError={() => setThumbError(true)}
        />
      )}
      <div className="flex-1 min-w-0">
        {ytInfo.title ? (
          <p
            className={`${s.title} font-medium line-clamp-2`}
            style={{ color: 'var(--text-body)' }}
            title={ytInfo.title}
          >
            {ytInfo.title}
          </p>
        ) : (
          <p className={s.badge} style={{ color: 'var(--text-muted)' }}>
            Loading title...
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <Youtube size={s.ytIcon} style={{ color: 'var(--accent-primary)' }} />
          <span className={s.badge} style={{ color: 'var(--text-muted)' }}>
            YouTube
          </span>
          <ExternalLink size={s.extIcon} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </motion.a>
  );
}
