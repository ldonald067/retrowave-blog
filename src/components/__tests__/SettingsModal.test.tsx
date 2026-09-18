import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
  return {
    motion: new Proxy(
      {},
      {
        get:
          (_t, tag: string) =>
          ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
            React.createElement(tag, strip(props), children),
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { signOut: vi.fn() },
  },
}));

vi.mock('../../lib/auth-guard', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, error: null }),
}));

vi.mock('../../lib/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../../lib/capacitor', () => ({
  hapticImpact: vi.fn().mockResolvedValue(undefined),
  saveTextFile: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../hooks/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));

import SettingsModal from '../SettingsModal';
import { supabase } from '../../lib/supabase';

/**
 * Account deletion, end to end inside the modal. The regression these guard:
 * the modal called supabase.auth.signOut directly, which useAuth read as an
 * expired session — so a successful deletion showed "ur session expired"
 * beside the farewell.
 */
describe('SettingsModal account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderAndConfirm(props: Partial<Parameters<typeof SettingsModal>[0]> = {}) {
    const handlers = {
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onSignOut: vi.fn().mockResolvedValue({ error: null }),
      ...props,
    };
    render(<SettingsModal {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete everything/i }));
    return handlers;
  }

  it('signs out through the app, locally, and says farewell', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
    const handlers = renderAndConfirm();

    await waitFor(() => expect(handlers.onSuccess).toHaveBeenCalled());
    expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account');
    expect(handlers.onSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(handlers.onSuccess).toHaveBeenCalledWith(expect.stringMatching(/farewell/));
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it('says nothing was removed when the deletion fails, and stays signed in', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'violates foreign key constraint' },
    } as never);
    const handlers = renderAndConfirm();

    await waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringMatching(/nothing was removed/i));
    expect(handlers.onSignOut).not.toHaveBeenCalled();
    expect(handlers.onSuccess).not.toHaveBeenCalled();
  });
});
