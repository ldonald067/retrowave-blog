import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicProfileView from '../PublicProfileView';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { openUrl } from '../../lib/capacitor';
import type { PublicPost, PublicProfileData } from '../../types/profile';

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

vi.mock('../../utils/parseYouTube', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/parseYouTube')>()),
  fetchYouTubeTitle: vi.fn().mockResolvedValue('Such Great Heights'),
}));

vi.mock('../../lib/capacitor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/capacitor')>()),
  openUrl: vi.fn(),
}));

const publicPost: PublicPost = {
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
};

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
  posts: [publicPost],
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

  it('shows the status once, in the marquee, labelled for screen readers', () => {
    const { container } = render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    const status = screen.getByText(/still up at 2am/i);
    expect(container.querySelector('.marquee-banner-status')).toContainElement(status);
    expect(container.querySelector('.marquee-banner-status')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByText(/jane's status:/i)).toBeInTheDocument();
  });

  it('renders no marquee when the profile has no status', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: { ...publicData, profile: { ...publicData.profile, status_message: '  ' } },
      loading: false,
      notFound: false,
    });
    const { container } = render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(container.querySelector('.marquee-banner')).not.toBeInTheDocument();
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

  it("shows an entry's mood and opens its YouTube song in the in-app browser", async () => {
    const watchUrl = 'https://www.youtube.com/watch?v=0wrsZog8qXg';
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        ...publicData,
        posts: [{ ...publicPost, mood: '😊 happy', music: watchUrl }],
      },
      loading: false,
      notFound: false,
    });
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.getByText('😊 happy')).toBeInTheDocument();
    const song = await screen.findByRole('link', {
      name: 'Listen on YouTube: Such Great Heights',
    });
    fireEvent.click(song);
    expect(openUrl).toHaveBeenCalledWith(watchUrl);
  });

  it('shows a song that is not a YouTube link as plain text', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: {
        ...publicData,
        posts: [{ ...publicPost, music: 'the postal service - such great heights' }],
      },
      loading: false,
      notFound: false,
    });
    render(
      <PublicProfileView
        username="jane"
        isAuthenticated={false}
        onSignUp={vi.fn()}
        onGoHome={vi.fn()}
      />
    );

    expect(screen.getByText('the postal service - such great heights')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /listen on youtube/i })).not.toBeInTheDocument();
  });
});
