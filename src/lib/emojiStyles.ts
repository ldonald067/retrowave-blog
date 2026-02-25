/**
 * Emoji Style System
 *
 * Provides 5 emoji rendering styles (native + 4 CDN-based sets).
 * Preference stored in localStorage — no DB migration needed.
 * Uses a module-level reactive store so any component can subscribe
 * via `useEmojiStyle()` without React context or prop drilling.
 *
 * CDN: All non-native styles load from jsDelivr (free, reliable).
 * Fallback: StyledEmoji component falls back to native on img error.
 */

import { useState, useEffect } from 'react';

// ── Style definitions ──────────────────────────────────────────────

export type EmojiStyleId = 'native' | 'fluent' | 'twemoji' | 'openmoji' | 'blob';

export interface EmojiStyle {
  id: EmojiStyleId;
  name: string;
  description: string;
  /** License notice (displayed in footer attribution) */
  license: string;
}

export const EMOJI_STYLES: EmojiStyle[] = [
  { id: 'native', name: 'native', description: 'ur device emoji', license: '' },
  {
    id: 'fluent',
    name: '3D fluent',
    description: 'glossy & bubbly',
    license: 'MIT',
  },
  {
    id: 'twemoji',
    name: 'twemoji',
    description: 'classic twitter',
    license: 'CC-BY 4.0',
  },
  {
    id: 'openmoji',
    name: 'openmoji',
    description: 'hand-drawn vibes',
    license: 'CC BY-SA 4.0',
  },
  {
    id: 'blob',
    name: 'blob',
    description: 'cute google blobs',
    license: 'Apache 2.0',
  },
];

// ── localStorage persistence ───────────────────────────────────────

const STORAGE_KEY = 'emoji-style';

function loadStyle(): EmojiStyleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && EMOJI_STYLES.some((s) => s.id === stored)) {
      return stored as EmojiStyleId;
    }
  } catch {
    // localStorage unavailable (iOS private browsing, restricted context)
  }
  return 'native';
}

// ── Module-level reactive store ────────────────────────────────────

let _currentStyle: EmojiStyleId = loadStyle();
const _listeners = new Set<() => void>();

export function getEmojiStyle(): EmojiStyleId {
  return _currentStyle;
}

export function setEmojiStyle(style: EmojiStyleId): void {
  _currentStyle = style;
  localStorage.setItem(STORAGE_KEY, style);

  // Preload the 6 reaction emoji for instant display
  if (style !== 'native') {
    const reactionEmoji = ['❤️', '🔥', '😂', '😢', '✨', '👀'];
    reactionEmoji.forEach((emoji) => {
      const url = getStyledEmojiUrl(emoji, style);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }

  _listeners.forEach((fn) => fn());
}

/**
 * React hook — subscribes to emoji style changes.
 * Re-renders the component when setEmojiStyle() is called anywhere.
 */
export function useEmojiStyle(): EmojiStyleId {
  const [style, setStyle] = useState<EmojiStyleId>(_currentStyle);
  useEffect(() => {
    // Sync in case style changed between render and effect
    setStyle(_currentStyle);
    const listener = () => setStyle(_currentStyle);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);
  return style;
}

// ── Emoji → codepoint conversion ───────────────────────────────────

/**
 * Converts a Unicode emoji string to a dash-separated hex codepoint string.
 * e.g., '🔥' → '1f525', '❤️' → '2764-fe0f'
 */
export function emojiToCodepoint(emoji: string): string {
  const codepoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codepoints.push(cp.toString(16).toLowerCase());
    }
  }
  return codepoints.join('-');
}

// ── CDN URL builders ───────────────────────────────────────────────

function buildUrl(codepoint: string, style: EmojiStyleId): string | null {
  switch (style) {
    case 'native':
      return null;
    case 'fluent':
      // Microsoft Fluent Emoji 3D — MIT license, codepoint-based PNG
      return `https://cdn.jsdelivr.net/gh/ehne/fluentui-twemoji-3d/export/3D_png/${codepoint}.png`;
    case 'twemoji':
      // Twemoji (jdecked fork) — CC-BY 4.0, codepoint-based SVG
      return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoint}.svg`;
    case 'openmoji':
      // OpenMoji — CC BY-SA 4.0, UPPERCASE codepoint SVG
      return `https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/${codepoint.toUpperCase()}.svg`;
    case 'blob':
      // Google Blob emoji — Apache 2.0, UPPERCASE codepoint SVG
      return `https://cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/svg/${codepoint.toUpperCase()}.svg`;
  }
}

/**
 * Get the CDN URL for a styled emoji.
 * Returns null for 'native' style (render as Unicode text).
 */
export function getStyledEmojiUrl(emoji: string, style?: EmojiStyleId): string | null {
  const s = style ?? _currentStyle;
  if (s === 'native') return null;
  const codepoint = emojiToCodepoint(emoji);
  return buildUrl(codepoint, s);
}

/**
 * Returns attribution text for the current emoji style (for footer).
 * Returns null for 'native' (no attribution needed).
 */
export function getEmojiAttribution(): string | null {
  const style = EMOJI_STYLES.find((s) => s.id === _currentStyle);
  if (!style || style.id === 'native' || !style.license) return null;

  const names: Record<string, string> = {
    fluent: 'Microsoft Fluent Emoji',
    twemoji: 'Twemoji',
    openmoji: 'OpenMoji',
    blob: 'Google Blob Emoji',
  };

  return `Emoji: ${names[style.id]} (${style.license})`;
}
