import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicProfileView from '../PublicProfileView';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import type { PublicProfileData } from '../../types/profile';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    article: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

vi.mock('../../hooks/usePublicProfile', () => ({
  usePublicProfile: vi.fn(),
}));

vi.mock('../../lib/themes', () => ({
  applyTheme: vi.fn(),
  DEFAULT_THEME: 'default',
}));

vi.mock('../LoadingSpinner', () => ({
  default: () => <div>loading...</div>,
}));

vi.mock('../ui', () => ({
  Avatar: ({ alt }: { alt: string }) => <div data-testid="avatar">{alt}</div>,
}));

const publicData: PublicProfileData = {
  profile: {
    username: 'jane',
    display_name: 'Jane',
    bio: 'A quiet public corner.',
    avatar_url: null,
    theme: null,
    current_mood: null,
    current_music: null,
    status_message: 'still up at 2am',
    created_at: '2026-04-17T00:00:00Z',
  },
  posts: [
    {
      id: 'post-1',
      title: 'A public thought',
      content: 'Shared on purpose.',
      author: 'Jane',
      chapter: null,
      mood: null,
      music: null,
      is_private: false,
      created_at: '2026-04-17T00:00:00Z',
      content_truncated: false,
    },
  ],
};

describe('PublicProfileView', () => {
  beforeEach(() => {
    document.title = 'My Journal | Private Retro Journal';
    document.head.innerHTML = `
      <meta name="title" content="My Journal | Private Retro Journal" />
      <meta name="description" content="Default description" />
      <meta property="og:title" content="My Journal | Private Retro Journal" />
      <meta property="og:description" content="Default description" />
      <meta name="twitter:title" content="My Journal | Private Retro Journal" />
      <meta name="twitter:description" content="Default description" />
    `;
    vi.mocked(usePublicProfile).mockReturnValue({
      data: publicData,
      loading: false,
      notFound: false,
    });
  });

  it('provides lightweight report links for public content', () => {
    render(<PublicProfileView username="jane" onSignUp={vi.fn()} onGoHome={vi.fn()} />);

    expect(screen.getByRole('link', { name: /report public entry/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    );
    expect(screen.getByRole('link', { name: /report public page/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    );
  });

  it('keeps the public page read-only without reaction prompts', () => {
    render(<PublicProfileView username="jane" onSignUp={vi.fn()} onGoHome={vi.fn()} />);

    expect(screen.queryByText(/sign up to react/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/react/i)).not.toBeInTheDocument();
  });

  it('shows the profile status message when present', () => {
    render(<PublicProfileView username="jane" onSignUp={vi.fn()} onGoHome={vi.fn()} />);

    expect(screen.getByText(/still up at 2am/i)).toBeInTheDocument();
  });

  it('updates the document title and share description for the public page', () => {
    render(<PublicProfileView username="jane" onSignUp={vi.fn()} onGoHome={vi.fn()} />);

    expect(document.title).toBe('Jane | My Journal');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'still up at 2am',
    );
    expect(screen.getByRole('button', { name: /browse home/i })).toBeInTheDocument();
  });
});
