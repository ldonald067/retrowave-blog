import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
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

  it('opens an in-app report dialog instead of a mailto link', () => {
    // Guideline 1.2: reporting used to be a mailto: link, which silently did
    // nothing on a device with no Mail account. It must be a real in-app flow.
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.queryByRole('link', { name: /report public entry/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /report public entry/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /harassment or bullying/i })).toBeInTheDocument();
    // Send is disabled until a reason is picked
    expect(screen.getByRole('button', { name: /send report/i })).toBeDisabled();
  });

  it('offers a reachable block control that routes signed-out users to sign-up', () => {
    // The PostCard block button can never render on a public page (the feed RPC
    // returns own posts only), so this is the app's only reachable block path.
    const onSignUp = vi.fn();
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={onSignUp}
        onGoHome={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /block @jane/i }));
    expect(onSignUp).toHaveBeenCalled();
  });

  it('keeps the public page read-only without reaction prompts', () => {
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.queryByText(/sign up to react/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/react/i)).not.toBeInTheDocument();
  });

  it('shows the profile status message when present', () => {
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.getByText(/still up at 2am/i)).toBeInTheDocument();
  });

  it('updates the document title and share description for the public page', () => {
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(document.title).toBe('Jane | My Journal');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'still up at 2am'
    );
    expect(screen.getByRole('button', { name: /browse home/i })).toBeInTheDocument();
  });
});
