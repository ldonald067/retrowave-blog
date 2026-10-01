import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Profile } from '../../types/profile';

// The editor's "save changes" stays on screen while the avatar picker is open.
// It used to save the old avatar and close, dropping the pick (finding 86).

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
    fetchBlockedUsers: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));
vi.mock('../../lib/celebrations', () => ({ sparkleBurst: vi.fn(), emojiRain: vi.fn() }));
vi.mock('../../lib/username', () => ({ isUsernameAvailable: vi.fn().mockResolvedValue(true) }));
vi.mock('../../lib/themes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/themes')>()),
  applyTheme: vi.fn(),
}));

import ProfileModal from '../ProfileModal';

const OLD_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=old';

const profile: Profile = {
  id: 'user-1',
  username: 'ldonald234',
  display_name: 'ldonald234',
  bio: null,
  avatar_url: OLD_AVATAR,
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

describe('ProfileModal avatar picker', () => {
  type OnSave = (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  let onSave: ReturnType<typeof vi.fn<OnSave>>;

  beforeEach(() => {
    onSave = vi.fn<OnSave>().mockResolvedValue({ error: null });
    render(<ProfileModal profile={profile} userId="user-1" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '~ choose avatar ~' }));
  });

  const saveChanges = () => fireEvent.click(screen.getByRole('button', { name: /save changes/ }));

  it('saves the avatar on show when "save changes" is tapped with the picker open', async () => {
    const pixelArt = screen.getByRole('button', { name: 'Pixel Art' });
    fireEvent.click(pixelArt);
    // The chips say which one is chosen (finding 88).
    expect(pixelArt).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Robots' })).toHaveAttribute('aria-pressed', 'false');

    saveChanges();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0].avatar_url).toMatch(/\/pixel-art\/svg\?seed=/);
  });

  it('keeps the old avatar when the picker was only opened', async () => {
    // The picker opens on its own default avatar, which nobody chose.
    saveChanges();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0].avatar_url).toBe(OLD_AVATAR);
  });

  it('drops a pick when the person goes back out of the picker', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Pixel Art' }));
    fireEvent.click(screen.getByRole('button', { name: /go back/ }));

    saveChanges();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0].avatar_url).toBe(OLD_AVATAR);
  });
});
