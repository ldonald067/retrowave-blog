import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Profile } from '../../types/profile';

// The safety tab named each blocked person by the first 8 characters of their
// user id, so you could not tell whom you were unblocking (finding 100).

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const strip = ({
    whileTap: _whileTap,
    whileHover: _whileHover,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    drag: _drag,
    dragConstraints: _dragConstraints,
    dragElastic: _dragElastic,
    dragSnapToOrigin: _dragSnapToOrigin,
    onDragEnd: _onDragEnd,
    ...rest
  }: Record<string, unknown>) => rest;
  // One component per tag (see ProfileSetup.test.tsx for why).
  const cache = new Map<string, React.ForwardRefExoticComponent<Record<string, unknown>>>();
  const component = (tag: string) => {
    if (!cache.has(tag)) {
      cache.set(
        tag,
        React.forwardRef(
          ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>, ref) =>
            React.createElement(tag, { ...strip(props), ref }, children)
        ) as React.ForwardRefExoticComponent<Record<string, unknown>>
      );
    }
    return cache.get(tag)!;
  };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => component(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../../hooks/useBlocks', () => ({
  useBlocks: () => ({
    toggleBlock: vi.fn(),
    fetchBlockedUsers: vi.fn().mockResolvedValue({
      data: [
        {
          blocked_id: '748e75eb-97c8-4db5-a514-d289b1fdda98',
          created_at: '2026-10-17T12:00:00Z',
          username: 'glitterqueen',
          display_name: 'Glitter Queen',
        },
        {
          blocked_id: '1b2c3d4e-0000-4000-8000-000000000000',
          created_at: '2026-10-16T12:00:00Z',
          username: 'nodisplayname',
          display_name: '  ',
        },
        // get_blocked_users withholds the name once their page is private.
        {
          blocked_id: '9f8e7d6c-0000-4000-8000-000000000000',
          created_at: '2026-10-15T12:00:00Z',
          username: null,
          display_name: null,
        },
      ],
      error: null,
    }),
  }),
}));
vi.mock('../../lib/celebrations', () => ({ sparkleBurst: vi.fn(), emojiRain: vi.fn() }));
vi.mock('../../lib/username', () => ({ isUsernameAvailable: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/themes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/themes')>()),
  applyTheme: vi.fn(),
}));

import ProfileModal from '../ProfileModal';

const profile: Profile = {
  id: 'user-1',
  username: 'ldonald234',
  display_name: 'ldonald234',
  bio: null,
  avatar_url: null,
  birth_year: 2000,
  age_verified: true,
  tos_accepted: true,
  theme: 'cottage-core',
  current_mood: null,
  current_music: null,
  status_message: null,
  is_admin: false,
  is_public: false,
  private_chapters: [],
  username_changed_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-09-26T00:00:00Z',
};

describe('ProfileModal blocked users', () => {
  it('names each blocked person, or says their page is private', async () => {
    render(<ProfileModal profile={profile} userId="user-1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'safety' }));
    const panel = screen.getByRole('tabpanel');

    expect(await within(panel).findByText('Glitter Queen')).toBeInTheDocument();
    expect(within(panel).getByText('@glitterqueen')).toBeInTheDocument();
    // A blank display name falls back to the handle, shown once.
    expect(within(panel).getAllByText('@nodisplayname')).toHaveLength(1);
    expect(within(panel).getByText('someone w/ a private page')).toBeInTheDocument();
    expect(within(panel).getByText('blocked Oct 15, 2026')).toBeInTheDocument();
    expect(within(panel).queryByText(/748e75eb/)).not.toBeInTheDocument();
    expect(within(panel).getAllByRole('button', { name: '~ unblock ~' })).toHaveLength(3);
  });
});
