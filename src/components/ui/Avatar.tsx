import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  fallbackSeed?: string;
  className?: string;
  onClick?: () => void;
  editable?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

export default function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  fallbackSeed = 'default',
  className = '',
  onClick,
  editable = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Reset error state when src changes — adjusted during render instead of
  // in an effect so the stale error never paints.
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setImgError(false);
    setFallbackError(false);
  }

  const fallbackUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackSeed}`;
  const imageSrc = imgError || !src ? fallbackUrl : src;

  const baseClasses = `${sizeClasses[size]} rounded-full border-4 object-cover`;
  const interactiveClasses = onClick || editable ? 'cursor-pointer' : '';

  return (
    // onClick sits here rather than on an overlay: the overlay that used to
    // carry it was opacity-0 until :hover, so on iOS the avatar was tappable
    // with nothing on screen saying so. Both call sites already render a
    // visible control (the gear button in Sidebar, "~ choose avatar ~" in
    // ProfileModal), so tapping the avatar is a shortcut, not the affordance.
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={onClick || editable ? { scale: 1.05 } : undefined}
      onClick={onClick}
    >
      {fallbackError ? (
        <div
          className={`${baseClasses} ${interactiveClasses} flex items-center justify-center`}
          style={{
            borderColor: 'var(--accent-primary)',
            backgroundColor: 'var(--card-bg)',
          }}
          onClick={onClick}
        >
          <User size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          className={`${baseClasses} ${interactiveClasses}`}
          style={{
            borderColor: 'var(--accent-primary)',
            backgroundColor: 'var(--card-bg)',
          }}
          onClick={onClick}
          onError={() => {
            if (imgError) {
              setFallbackError(true);
            } else {
              setImgError(true);
            }
          }}
        />
      )}
    </motion.div>
  );
}
