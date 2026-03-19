import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChapterChips from '../ChapterChips';
import type { Chapter } from '../../hooks/useChapters';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      whileTap: _whileTap,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { whileTap?: unknown }>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

const mockChapters: Chapter[] = [
  { chapter: 'deep thoughts', post_count: 3, latest_post: '2026-03-15T00:00:00Z' },
  { chapter: 'daily vibes', post_count: 2, latest_post: '2026-03-10T00:00:00Z' },
];

describe('ChapterChips', () => {
  const defaultProps = {
    chapters: mockChapters,
    activeChapter: null,
    onChapterSelect: vi.fn(),
    postCount: 7,
    looseCount: 2,
    looseKey: '__loose__',
  };

  // ── Rendering ─────────────────────────────────────────────────────────

  it('renders all entries chip with total post count', () => {
    render(<ChapterChips {...defaultProps} />);
    expect(screen.getByText('✨ all entries')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders chapter chips with counts', () => {
    render(<ChapterChips {...defaultProps} />);
    expect(screen.getByText(/deep thoughts/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/daily vibes/)).toBeInTheDocument();
    // '2' appears twice (loose entries + daily vibes), so use getAllByText
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('renders loose entries chip when looseCount > 0', () => {
    render(<ChapterChips {...defaultProps} />);
    expect(screen.getByText('🍃 loose entries')).toBeInTheDocument();
  });

  it('hides loose entries chip when looseCount is 0', () => {
    render(<ChapterChips {...defaultProps} looseCount={0} />);
    expect(screen.queryByText('🍃 loose entries')).not.toBeInTheDocument();
  });

  it('returns null when no chapters exist', () => {
    const { container } = render(
      <ChapterChips {...defaultProps} chapters={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  // ── Interactions ──────────────────────────────────────────────────────

  it('calls onChapterSelect(null) when all entries chip is clicked', () => {
    const onSelect = vi.fn();
    render(<ChapterChips {...defaultProps} onChapterSelect={onSelect} />);
    fireEvent.click(screen.getByText('✨ all entries'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onChapterSelect with chapter name when a chapter chip is clicked', () => {
    const onSelect = vi.fn();
    render(<ChapterChips {...defaultProps} onChapterSelect={onSelect} />);
    fireEvent.click(screen.getByText(/deep thoughts/));
    expect(onSelect).toHaveBeenCalledWith('deep thoughts');
  });

  it('calls onChapterSelect with looseKey when loose entries chip is clicked', () => {
    const onSelect = vi.fn();
    render(<ChapterChips {...defaultProps} onChapterSelect={onSelect} />);
    fireEvent.click(screen.getByText('🍃 loose entries'));
    expect(onSelect).toHaveBeenCalledWith('__loose__');
  });

  // ── Active state ──────────────────────────────────────────────────────

  it('marks the active chapter chip with aria-selected', () => {
    render(<ChapterChips {...defaultProps} activeChapter="deep thoughts" />);
    const activeChip = screen.getByRole('tab', { selected: true });
    expect(activeChip).toHaveTextContent('deep thoughts');
  });

  it('marks all entries as active when activeChapter is null', () => {
    render(<ChapterChips {...defaultProps} activeChapter={null} />);
    const activeChip = screen.getByRole('tab', { selected: true });
    expect(activeChip).toHaveTextContent('all entries');
  });

  it('marks loose entries as active when activeChapter matches looseKey', () => {
    render(<ChapterChips {...defaultProps} activeChapter="__loose__" />);
    const activeChip = screen.getByRole('tab', { selected: true });
    expect(activeChip).toHaveTextContent('loose entries');
  });

  // ── Accessibility ─────────────────────────────────────────────────────

  it('has tablist role with aria-label', () => {
    render(<ChapterChips {...defaultProps} />);
    expect(screen.getByRole('tablist', { name: 'Chapter filter' })).toBeInTheDocument();
  });

  it('active tab has tabIndex 0, others have tabIndex -1', () => {
    render(<ChapterChips {...defaultProps} activeChapter="daily vibes" />);
    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    const inactiveTabs = tabs.filter((t) => t.getAttribute('aria-selected') === 'false');

    expect(activeTab).toHaveAttribute('tabindex', '0');
    inactiveTabs.forEach((tab) => {
      expect(tab).toHaveAttribute('tabindex', '-1');
    });
  });
});
