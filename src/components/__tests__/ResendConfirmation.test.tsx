import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const { resendConfirmation } = vi.hoisted(() => ({
  resendConfirmation: vi.fn(),
}));

vi.mock('../../lib/auth-actions', () => ({ resendConfirmation }));

import ResendConfirmation, { RESEND_COOLDOWN_SECONDS } from '../ResendConfirmation';

const button = () => screen.getByRole('button');

describe('ResendConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('sends to the given address, says so, and counts down before the next send', async () => {
    resendConfirmation.mockResolvedValueOnce({ error: null });
    render(<ResendConfirmation email="a@b.com" />);

    await act(async () => {
      fireEvent.click(button());
    });

    expect(resendConfirmation).toHaveBeenCalledWith('a@b.com');
    expect(screen.getByRole('status')).toHaveTextContent(/sent!!/);
    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent(`resend again in ${RESEND_COOLDOWN_SECONDS}s`);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(button()).toHaveTextContent(`resend again in ${RESEND_COOLDOWN_SECONDS - 1}s`);

    for (let i = 1; i < RESEND_COOLDOWN_SECONDS; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(button()).toBeEnabled();
    expect(button()).toHaveTextContent(/resend the confirmation email/);
  });

  it("counts down Supabase's own wait when it refuses a send", async () => {
    resendConfirmation.mockResolvedValueOnce({
      error: 'Please wait 42 seconds before asking for another email.',
      retryAfterSeconds: 42,
    });
    render(<ResendConfirmation email="a@b.com" />);

    await act(async () => {
      fireEvent.click(button());
    });

    expect(screen.getByRole('status')).toHaveTextContent(/wait 42 seconds/);
    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent('resend again in 42s');
  });

  it('stays usable after an ordinary failure', async () => {
    resendConfirmation.mockResolvedValueOnce({ error: 'Network error.' });
    render(<ResendConfirmation email="a@b.com" />);

    await act(async () => {
      fireEvent.click(button());
    });

    expect(screen.getByRole('status')).toHaveTextContent('Network error.');
    expect(button()).toBeEnabled();
  });
});
