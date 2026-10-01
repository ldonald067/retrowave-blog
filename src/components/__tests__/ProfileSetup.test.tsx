import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Profile } from '../../types/profile';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const strip = ({
    whileTap: _whileTap,
    whileHover: _whileHover,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    ...rest
  }: Record<string, unknown>) => rest;
  // One component per tag, made once. A Proxy that builds a fresh component on
  // every access gives React a new type each render, so it remounts the whole
  // step — and a test holding an input or button then holds a detached node.
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

vi.mock('../../lib/celebrations', () => ({ sparkleBurst: vi.fn(), emojiRain: vi.fn() }));

const { isUsernameAvailable } = vi.hoisted(() => ({
  isUsernameAvailable: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../lib/username', () => ({ isUsernameAvailable }));

const { applyTheme } = vi.hoisted(() => ({ applyTheme: vi.fn() }));
vi.mock('../../lib/themes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/themes')>()),
  applyTheme,
}));

import ProfileSetup from '../ProfileSetup';

const profile: Profile = {
  id: 'user-1',
  username: 'rainbowpudding1',
  display_name: null,
  bio: null,
  avatar_url: null,
  birth_year: 2000,
  age_verified: true,
  tos_accepted: true,
  theme: null,
  current_mood: null,
  current_music: null,
  status_message: null,
  is_admin: false,
  is_public: false,
  private_chapters: [],
  username_changed_at: null,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: '2026-09-26T00:00:00Z',
};

const next = () => fireEvent.click(screen.getByRole('button', { name: '~ next ~' }));
const typeName = (name: string) =>
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: name } });

describe('ProfileSetup', () => {
  type OnSave = (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  let onSave: ReturnType<typeof vi.fn<OnSave>>;
  beforeEach(() => {
    vi.clearAllMocks();
    onSave = vi.fn<OnSave>().mockResolvedValue({ error: null });
  });

  it('asks only for the display name first, marked required, with the handle already set', () => {
    render(<ProfileSetup profile={profile} onSave={onSave} />);

    expect(screen.getByRole('heading', { name: /what should we call u/i })).toBeInTheDocument();
    expect(screen.getByText('required')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveFocus();
    // The username was chosen at sign-up; setup shows it, never asks again.
    expect(screen.getByText('@rainbowpudding1')).toBeInTheDocument();
    expect(screen.queryByLabelText(/@handle/i)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('will not move on without a name, and says so in the app voice', () => {
    render(<ProfileSetup profile={profile} onSave={onSave} />);
    next();
    expect(screen.getByText(/pick a name 2 continue/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what should we call u/i })).toBeInTheDocument();
  });

  it('refuses a name the save would refuse on the name step, not two steps later', () => {
    // "dyke" is on the content filter's list; the save path (useAuth
    // updateProfile) runs the same check, and its refusal used to arrive as a
    // toast on "finishing touches", where there is no name field (finding 81).
    render(<ProfileSetup profile={profile} onSave={onSave} />);
    typeName('emma van dyke');
    next();

    expect(screen.getByText(/that name isn't allowed here/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what should we call u/i })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('previews themes live on an optional step, and keeps the name on the way back', async () => {
    render(<ProfileSetup profile={profile} onSave={onSave} />);
    typeName('Glitter');
    next();

    expect(await screen.findByRole('heading', { name: /pick ur vibe/i })).toHaveFocus();
    expect(screen.getByText('optional')).toBeInTheDocument();

    const emo = screen.getByRole('button', { name: /emo/i });
    fireEvent.click(emo);
    expect(applyTheme).toHaveBeenCalled();
    expect(emo).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByLabelText('Display name')).toHaveValue('Glitter');
  });

  it('saves everything on "save + start writing"', async () => {
    render(<ProfileSetup profile={profile} onSave={onSave} />);
    typeName('  Glitter  ');
    next();
    await screen.findByRole('heading', { name: /pick ur vibe/i });
    next();
    await screen.findByRole('heading', { name: /finishing touches/i });

    fireEvent.change(screen.getByLabelText('status message'), {
      target: { value: 'hi from 2005' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save \+ start writing/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        display_name: 'Glitter',
        theme: 'classic-xanga',
        status_message: 'hi from 2005',
      })
    );
  });

  it('"skip 4 now" saves the name and theme and leaves the extras out', async () => {
    render(<ProfileSetup profile={profile} onSave={onSave} />);
    typeName('Glitter');
    next();
    await screen.findByRole('heading', { name: /pick ur vibe/i });
    next();
    await screen.findByRole('heading', { name: /finishing touches/i });

    fireEvent.change(screen.getByLabelText('status message'), { target: { value: 'typed' } });
    fireEvent.click(screen.getByRole('button', { name: /skip 4 now/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ display_name: 'Glitter', theme: 'classic-xanga' })
    );
  });

  it('offers the username only when sign-up could not give them the one they asked for', async () => {
    render(
      <ProfileSetup
        profile={{ ...profile, username: 'glitter_b1a785fd' }}
        requestedUsername="glitter"
        onSave={onSave}
      />
    );
    expect(screen.getByText(/@glitter wasn't available/)).toBeInTheDocument();
    const handle = screen.getByLabelText(/@handle/i);

    isUsernameAvailable.mockResolvedValueOnce(false);
    typeName('Glitter');
    fireEvent.change(handle, { target: { value: 'Glitter2' } });
    next();
    expect(await screen.findByText(/@glitter2 is taken/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what should we call u/i })).toBeInTheDocument();
  });
});
