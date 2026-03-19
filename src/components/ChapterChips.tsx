import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Chapter } from '../hooks/useChapters';

interface ChapterChipsProps {
  chapters: Chapter[];
  activeChapter: string | null;
  onChapterSelect: (chapter: string | null) => void;
  postCount: number;
  looseCount?: number;
  looseKey?: string;
}

/**
 * Horizontal scrollable chip row for chapter navigation on mobile.
 * Always visible above the feed (no sidebar expansion needed).
 * Uses native scroll-snap for iOS-native swipe feel.
 */
export default function ChapterChips({
  chapters,
  activeChapter,
  onChapterSelect,
  postCount,
  looseCount = 0,
  looseKey = '__loose__',
}: ChapterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    // Also recheck on resize (orientation change)
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, chapters.length]);

  // Scroll active chip into view on mount / chapter change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [activeChapter]);

  // Arrow key navigation for tabs (WAI-ARIA tabs pattern)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const tabs = Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'));
    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex >= 0) {
      e.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  if (chapters.length === 0) return null;

  const allChips = useMemo(() => [
    { id: null as string | null, label: 'all entries', count: postCount, icon: '✨' },
    ...(looseCount > 0 ? [{ id: looseKey as string | null, label: 'loose entries', count: looseCount, icon: '🍃' }] : []),
    ...chapters.map((ch) => ({ id: ch.chapter as string | null, label: ch.chapter, count: ch.post_count, icon: '📖' })),
  ], [chapters, postCount, looseCount, looseKey]);

  return (
    <div className="chapter-chips-wrapper lg:hidden relative mb-4">
      {/* Left fade */}
      <div
        className="chapter-chips-fade-left"
        style={{ opacity: canScrollLeft ? 1 : 0 }}
        aria-hidden="true"
      />
      {/* Right fade */}
      <div
        className="chapter-chips-fade-right"
        style={{ opacity: canScrollRight ? 1 : 0 }}
        aria-hidden="true"
      />

      <div
        ref={scrollRef}
        className="chapter-chips-scroll"
        role="tablist"
        aria-label="Chapter filter"
        onKeyDown={handleKeyDown}
      >
        {allChips.map((chip) => {
          const isActive = activeChapter === chip.id;
          return (
            <motion.button
              key={chip.id ?? '__all'}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChapterSelect(chip.id)}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              data-active={isActive}
              className="chapter-chip"
              style={{
                backgroundColor: isActive
                  ? 'var(--accent-primary)'
                  : 'var(--card-bg)',
                color: isActive
                  ? 'var(--card-bg)'
                  : 'var(--text-body)',
                borderColor: isActive
                  ? 'var(--accent-primary)'
                  : 'var(--border-primary)',
              }}
            >
              <span className="truncate max-w-[140px]">
                {chip.icon} {chip.label}
              </span>
              <span
                className="chapter-chip-count"
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.25)'
                    : 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  color: isActive
                    ? 'var(--card-bg)'
                    : 'var(--text-muted)',
                }}
              >
                {chip.count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
