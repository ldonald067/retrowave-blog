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
  currentUrl?: string | null;
  userId?: string;
  onSelect: (url: string) => void;
  onCancel?: () => void;
}

export default function AvatarPicker({
  currentUrl: _currentUrl,
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
    <div className="space-y-4">
      {/* Back button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-pink-600 transition"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      )}

      {/* Current Selection Preview */}
      <div className="flex items-center justify-center gap-4">
        <motion.img
          key={currentSelection}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={currentSelection}
          alt="Selected avatar"
          className="w-24 h-24 rounded-full border-4 border-pink-300 bg-white"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="xanga-button text-xs flex items-center gap-1"
          >
            <Shuffle size={12} />
            Randomize
          </button>
          <button
            type="button"
            onClick={() => onSelect(currentSelection)}
            className="xanga-button text-xs flex items-center gap-1 bg-gradient-to-r from-pink-200 to-purple-200"
          >
            <Check size={12} />
            Use This
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Category:</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {STYLE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                // Auto-select first style in category
                const firstInCategory = cat.id === 'all'
                  ? AVATAR_STYLES[0]
                  : AVATAR_STYLES.find(s => s.category === cat.id);
                if (firstInCategory) setSelectedStyle(firstInCategory.id);
              }}
              className={`px-2 py-1 text-xs rounded-full border transition ${
                selectedCategory === cat.id
                  ? 'bg-purple-200 border-purple-400 text-purple-800 font-semibold'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-purple-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Choose a style:</p>
        <div className="flex flex-wrap gap-1">
          {filteredStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setSelectedStyle(style.id)}
              className={`px-2 py-1 text-xs rounded-full border transition ${
                selectedStyle === style.id
                  ? 'bg-pink-200 border-pink-400 text-pink-800 font-semibold'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-pink-300'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar Grid */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Pick your avatar:</p>
        <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1">
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
                className={`relative p-1 rounded-full transition ${
                  selected
                    ? 'ring-2 ring-pink-400 ring-offset-2'
                    : 'hover:ring-2 hover:ring-pink-200'
                }`}
              >
                <img src={url} alt={seed} className="w-10 h-10 rounded-full bg-white" />
                {selected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Custom seed input for personalization */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1">Or type a custom word:</p>
        <input
          type="text"
          value={selectedSeed}
          onChange={(e) => setSelectedSeed(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          placeholder="your-custom-seed"
          maxLength={20}
          className="w-full px-3 py-2 text-sm border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          Same word = same avatar. Make it unique to you!
        </p>
      </div>
    </div>
  );
}
