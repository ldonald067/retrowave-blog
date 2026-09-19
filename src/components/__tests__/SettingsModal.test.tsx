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
    functions: { invoke: vi.fn() },
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

import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import SettingsModal from '../SettingsModal';
import { supabase } from '../../lib/supabase';

/**
 * Account deletion, end to end inside the modal. Deletion goes through the
 * delete-account edge function, which also sends the confirmation email. The
 * regression these guard:
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
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { deleted: true, emailed: true },
      error: null,
    } as never);
    const handlers = renderAndConfirm();

    await waitFor(() => expect(handlers.onSuccess).toHaveBeenCalled());
    // Through the edge function, which emails the user; no recipient is sent.
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(handlers.onSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(handlers.onSuccess).toHaveBeenCalledWith(expect.stringMatching(/farewell/));
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it('says nothing was removed only when the function reports the delete rolled back', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(JSON.stringify({ deleted: false }), { status: 500 })
      ),
    } as never);
    const handlers = renderAndConfirm();

    await waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringMatching(/nothing was removed/i));
    expect(handlers.onSignOut).not.toHaveBeenCalled();
    expect(handlers.onSuccess).not.toHaveBeenCalled();
  });

  it('does not claim nothing was removed when the outcome is unknown', async () => {
    // A dropped connection can arrive after the server finished deleting.
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Load failed')),
    } as never);
    const handlers = renderAndConfirm();

    await waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringMatching(/couldn't confirm/i));
    expect(handlers.onError).not.toHaveBeenCalledWith(
      expect.stringMatching(/nothing was removed/i)
    );
    expect(handlers.onSuccess).not.toHaveBeenCalled();
  });
});
