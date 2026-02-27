import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shuffle, ChevronLeft } from 'lucide-react';

// DiceBear avatar styles that fit the Xanga aesthetic
// These are all free and don't require moderation
const AVATAR_STYLES = [
  { id: 'bottts', name: 'Robots', category: 'character' },
  { id: 'avataaars', name: 'People', category: 'character' },
  { id: 'lorelei', name: 'Illustrated', category: 'character' },
  { id: 'notionists', name: 'Sketchy', category: 'character' },
  { id: 'adventurer', name: 'Adventure', category: 'character' },
  { id: 'big-smile', name: 'Big Smile', category: 'character' },
  { id: 'pixel-art', name: 'Pixel Art', category: 'character' },
  { id: 'thumbs', name: 'Thumbs', category: 'character' },
  // Pets
  { id: 'lorelei-neutral', name: 'Cute Pets', category: 'pets' },
  { id: 'big-ears', name: 'Big Ears', category: 'pets' },
  { id: 'big-ears-neutral', name: 'Fluffy', category: 'pets' },
  { id: 'croodles', name: 'Croodles', category: 'pets' },
  { id: 'croodles-neutral', name: 'Doodles', category: 'pets' },
  // Nature & Abstract
  { id: 'shapes', name: 'Shapes', category: 'nature' },
  { id: 'icons', name: 'Icons', category: 'nature' },
  { id: 'identicon', name: 'Geometric', category: 'nature' },
  { id: 'rings', name: 'Rings', category: 'nature' },
  { id: 'glass', name: 'Glass', category: 'nature' },
] as const;

// Categories for filtering
const STYLE_CATEGORIES = [
  { id: 'all', name: '✨ All' },
  { id: 'character', name: '👤 Characters' },
  { id: 'pets', name: '🐾 Pets' },
  { id: 'nature', name: '🌿 Nature' },
] as const;

// Pre-defined seeds for variety
const AVATAR_SEEDS = [
  'sparkle',
  'rainbow',
  'cosmic',
  'dreamer',
  'starlight',
  'moonbeam',
  'sunset',
  'galaxy',
  'nebula',
  'aurora',
  'crystal',
  'velvet',
  'orchid',
  'sapphire',
  'ember',
  'whisper',
  'echo',
  'harmony',
  'melody',
  'rhythm',
  'breeze',
  'storm',
  'thunder',
  'lightning',
  'frost',
  'blossom',
  'petal',
  'leaf',
  'fern',
  'willow',
];

interface AvatarPickerProps {
  userId?: string;
  onSelect: (url: string) => void;
  onCancel?: () => void;
}

export default function AvatarPicker({
  userId,
  onSelect,
  onCancel,
}: AvatarPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('bottts');
  const [selectedSeed, setSelectedSeed] = useState<string>(userId || 'sparkle');

  // Filter styles by category
  const filteredStyles = selectedCategory === 'all'
    ? AVATAR_STYLES
    : AVATAR_STYLES.filter(s => s.category === selectedCategory);

  const generateAvatarUrl = (style: string, seed: string) => {
    return `https://api.dicebear.com/7.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed)}`;
  };

  const currentSelection = generateAvatarUrl(selectedStyle, selectedSeed);

  const handleRandomize = () => {
    const randomSeed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
    const randomSuffix = Math.floor(Math.random() * 1000);
    setSelectedSeed(`${randomSeed}${randomSuffix}`);
  };

  return (
    <div className="space-y-3">
      {/* Back button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="xanga-link flex items-center gap-1 text-xs"
        >
          <ChevronLeft size={14} />
          ~ go back ~
        </button>
      )}

      {/* Current Selection Preview */}
      <div className="flex items-center justify-center gap-4">
        <motion.img
          key={currentSelection}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={currentSelection}
          alt={`Selected avatar: ${selectedStyle} style, ${selectedSeed} seed`}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4"
          style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--card-bg)' }}
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="xanga-button text-xs flex items-center gap-1"
          >
            <Shuffle size={12} />
            randomize!
          </button>
          <button
            type="button"
            onClick={() => onSelect(currentSelection)}
            className="xanga-button text-xs flex items-center gap-1"
          >
            <Check size={12} />
            ~ use this ~
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <p
          className="text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          category:
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {STYLE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                const firstInCategory = cat.id === 'all'
                  ? AVATAR_STYLES[0]
                  : AVATAR_STYLES.find(s => s.category === cat.id);
                if (firstInCategory) setSelectedStyle(firstInCategory.id);
              }}
              className="px-3 py-2 text-xs rounded-lg border-2 border-dotted transition font-bold min-h-[44px] lg:min-h-0"
              style={{
                backgroundColor: selectedCategory === cat.id
                  ? 'color-mix(in srgb, var(--accent-primary) 20%, var(--card-bg))'
                  : 'var(--card-bg)',
                borderColor: selectedCategory === cat.id
                  ? 'var(--accent-primary)'
                  : 'var(--border-primary)',
                color: selectedCategory === cat.id
                  ? 'var(--accent-primary)'
                  : 'var(--text-body)',
                fontFamily: 'var(--title-font)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      <div>
        <p
          className="text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          choose a style:
        </p>
        <div className="flex flex-wrap gap-1">
          {filteredStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setSelectedStyle(style.id)}
              className="px-3 py-2 text-xs rounded-lg border-2 border-dotted transition min-h-[44px] lg:min-h-0"
              style={{
                backgroundColor: selectedStyle === style.id
                  ? 'color-mix(in srgb, var(--accent-secondary) 20%, var(--card-bg))'
                  : 'var(--card-bg)',
                borderColor: selectedStyle === style.id
                  ? 'var(--accent-secondary)'
                  : 'var(--border-primary)',
                color: selectedStyle === style.id
                  ? 'var(--accent-secondary)'
                  : 'var(--text-body)',
                fontFamily: 'var(--title-font)',
              }}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar Grid — responsive: 4 cols on mobile, 5 on larger */}
      <div>
        <p
          className="text-xs font-bold mb-1"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          pick ur avatar:
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1">
          {AVATAR_SEEDS.slice(0, 20).map((seed) => {
            const url = generateAvatarUrl(selectedStyle, seed);
            const selected = selectedSeed === seed;
            return (
              <motion.button
                key={`${selectedStyle}-${seed}`}
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSeed(seed)}
                aria-pressed={selected}
                aria-label={`Avatar: ${selectedStyle} ${seed}${selected ? ' (selected)' : ''}`}
                className="relative p-1 rounded-full transition"
                style={{
                  outline: selected ? '2px solid var(--accent-primary)' : undefined,
                  outlineOffset: '2px',
                }}
              >
                <img
                  src={url}
                  alt={`${selectedStyle} avatar with seed "${seed}"`}
                  loading="lazy"
                  className="w-11 h-11 rounded-full"
                  style={{ backgroundColor: 'var(--card-bg)' }}
                />
                {selected && (
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Custom seed input */}
      <div>
        <label
          htmlFor="avatar-custom-seed"
          className="text-xs font-bold mb-1 block"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          or type a custom word:
        </label>
        <input
          id="avatar-custom-seed"
          type="text"
          value={selectedSeed}
          onChange={(e) => setSelectedSeed(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          placeholder="your-custom-seed"
          maxLength={20}
          className="w-full px-3 py-2 text-sm border-2 border-dotted rounded-lg focus:outline-none min-h-[44px]"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-body)',
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          same word = same avatar. make it unique 2 u!
        </p>
      </div>
    </div>
  );
}
