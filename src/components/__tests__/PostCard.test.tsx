import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostCard from '../PostCard';
import type { Post } from '../../types/post';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    article: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <article {...props}>{children}</article>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock hooks and dependencies
vi.mock('../../hooks/useYouTubeInfo', () => ({
  useYouTubeInfo: vi.fn(() => null),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock('rehype-sanitize', () => ({
  default: {},
}));

vi.mock('../ui', () => ({
  Pepicon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock('../ui/ReactionBar', () => ({
  default: () => <div data-testid="reaction-bar" />,
}));

vi.mock('../ui/YouTubeCard', () => ({
  default: () => <div data-testid="youtube-card" />,
}));

vi.mock('react-old-icons', () => ({
  Winamp: () => <span />,
}));

const basePost: Post = {
  id: 'post-1',
  user_id: 'user-1',
  title: 'My Test Post',
  content: 'This is some test content for the post card.',
  created_at: '2026-03-15T14:30:00Z',
  updated_at: '2026-03-15T14:30:00Z',
  mood: null,
  music: null,
  chapter: null,
  author: 'testuser',
  reactions: {},
  user_reactions: [],
  content_truncated: false,
  has_media: false,
  is_private: false,
};

describe('PostCard', () => {
  const defaultProps = {
    post: basePost,
    onView: vi.fn(),
    onReaction: vi.fn(),
    onBlock: vi.fn(),
    onChapterClick: vi.fn(),
    currentUserId: 'user-1', // owner by default
  };

  // ── Basic rendering ───────────────────────────────────────────────────

  it('renders post title', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByText('My Test Post')).toBeInTheDocument();
  });

  it('renders date without time or relative date', () => {
    render(<PostCard {...defaultProps} />);
    // Should show date in "MMM dd, yyyy" format
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument();
    // Should NOT show time or relative date
    expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it('renders post content', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByText(/This is some test content/)).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByText('~ testuser')).toBeInTheDocument();
  });

  // ── Chapter tag ───────────────────────────────────────────────────────

  it('shows chapter tag when post has a chapter', () => {
    const postWithChapter = { ...basePost, chapter: 'deep thoughts' };
    render(<PostCard {...defaultProps} post={postWithChapter} />);
    expect(screen.getByText('deep thoughts')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by chapter: deep thoughts')).toBeInTheDocument();
  });

  it('hides chapter tag when post has no chapter', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.queryByLabelText(/Filter by chapter/)).not.toBeInTheDocument();
  });

  it('calls onChapterClick when chapter tag is clicked', () => {
    const onChapter = vi.fn();
    const postWithChapter = { ...basePost, chapter: 'daily vibes' };
    render(<PostCard {...defaultProps} post={postWithChapter} onChapterClick={onChapter} />);
    fireEvent.click(screen.getByLabelText('Filter by chapter: daily vibes'));
    expect(onChapter).toHaveBeenCalledWith('daily vibes');
  });

  // ── Click-to-view ─────────────────────────────────────────────────────

  it('calls onView when title is clicked', () => {
    const onView = vi.fn();
    render(<PostCard {...defaultProps} onView={onView} />);
    fireEvent.click(screen.getByText('My Test Post'));
    expect(onView).toHaveBeenCalledWith(basePost);
  });

  it('title has accessible label', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByLabelText('View post: My Test Post')).toBeInTheDocument();
  });

  // ── Owner vs non-owner ────────────────────────────────────────────────

  it('does NOT show edit/delete icons in feed (removed from PostCard)', () => {
    render(<PostCard {...defaultProps} />);
    // Edit and delete icons should not exist in the feed card
    expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument();
  });

  it('does NOT show report/block for owner', () => {
    render(<PostCard {...defaultProps} currentUserId="user-1" />);
    expect(screen.queryByText('~ report ~')).not.toBeInTheDocument();
    expect(screen.queryByText('~ block ~')).not.toBeInTheDocument();
  });

  it('shows report/block for non-owner', () => {
    render(<PostCard {...defaultProps} currentUserId="other-user" />);
    expect(screen.getByText('~ report ~')).toBeInTheDocument();
    expect(screen.getByText('~ block ~')).toBeInTheDocument();
  });

  it('calls onBlock when block button is clicked (non-owner)', () => {
    const onBlock = vi.fn();
    render(<PostCard {...defaultProps} currentUserId="other-user" onBlock={onBlock} />);
    fireEvent.click(screen.getByLabelText('Block this user'));
    expect(onBlock).toHaveBeenCalledWith('user-1');
  });

  // ── Mood and music ────────────────────────────────────────────────────

  it('shows mood when present', () => {
    const postWithMood = { ...basePost, mood: '✨ feeling creative' };
    render(<PostCard {...defaultProps} post={postWithMood} />);
    expect(screen.getByText('✨ feeling creative')).toBeInTheDocument();
  });

  it('shows music when present', () => {
    const postWithMusic = { ...basePost, music: 'Radiohead - Creep' };
    render(<PostCard {...defaultProps} post={postWithMusic} />);
    expect(screen.getByText('Radiohead - Creep')).toBeInTheDocument();
  });

  // ── Read more ─────────────────────────────────────────────────────────

  it('shows read more when content is truncated', () => {
    const longPost = { ...basePost, content_truncated: true };
    render(<PostCard {...defaultProps} post={longPost} />);
    expect(screen.getByText('~ read more ~')).toBeInTheDocument();
  });

  it('hides read more when content is not truncated', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.queryByText('~ read more ~')).not.toBeInTheDocument();
  });

  // ── Reactions ─────────────────────────────────────────────────────────

  it('renders reaction bar', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
  });
});
