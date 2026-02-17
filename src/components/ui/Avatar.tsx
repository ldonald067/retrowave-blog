import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const fallbackUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackSeed}`;
  const imageSrc = imgError || !src ? fallbackUrl : src;

  const baseClasses = `${sizeClasses[size]} rounded-full border-4 border-pink-300 object-cover`;
  const interactiveClasses = onClick || editable ? 'cursor-pointer' : '';

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={onClick || editable ? { scale: 1.05 } : undefined}
    >
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        className={`${baseClasses} ${interactiveClasses} bg-gradient-to-br from-pink-200 to-purple-200`}
        onClick={onClick}
        onError={() => setImgError(true)}
      />
      {editable && (
        <div
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={onClick}
        >
          <span className="text-white text-xs font-medium">Edit</span>
        </div>
      )}
    </motion.div>
  );
}
