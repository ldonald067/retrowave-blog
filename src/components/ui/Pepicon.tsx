/**
 * Pepicon — retro icon component using the pepicons "Pop!" set.
 *
 * These have a chunky, bubbly 2000s web vibe vs lucide's clean modern lines.
 * Uses raw SVG strings from the pepicons package, rendered via dangerouslySetInnerHTML
 * (safe — the SVGs are static build-time strings from an npm package, not user input).
 */
import * as popIcons from 'pepicons/pop';

// Re-export the icon name type for autocomplete
type PopIconName = keyof typeof popIcons;

interface PepiconProps {
  /** Icon name from pepicons/pop (camelCase, e.g. "house", "floppyDisk") */
  name: PopIconName;
  /** Size in px (default 14) */
  size?: number;
  /** CSS color — use theme vars like 'var(--accent-primary)' */
  color?: string;
  /** Additional className */
  className?: string;
}

export default function Pepicon({ name, size = 14, color, className }: PepiconProps) {
  const svg = popIcons[name];
  if (!svg) return null;

  // Replace the width/height in the SVG to match our size prop
  const sized = svg
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'currentColor',
        lineHeight: 0,
      }}
      // Safe: SVGs are static strings from the pepicons npm package
      dangerouslySetInnerHTML={{ __html: sized }}
    />
  );
}
