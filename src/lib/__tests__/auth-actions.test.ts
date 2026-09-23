import { describe, it, expect, vi, beforeEach } from 'vitest';

const { resend } = vi.hoisted(() => ({ resend: vi.fn() }));

vi.mock('../supabase', () => ({ supabase: { auth: { resend } } }));
vi.mock('../auth-callback', () => ({ authRedirectTo: () => 'https://retrowaveblog.com' }));

import { resendConfirmation } from '../auth-actions';

describe('resendConfirmation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resends the sign-up email, back to where the app handles it', async () => {
    resend.mockResolvedValueOnce({ error: null });

    await expect(resendConfirmation('a@b.com')).resolves.toEqual({ error: null });
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.com',
      options: { emailRedirectTo: 'https://retrowaveblog.com' },
    });
  });

  it("turns Supabase's per-address throttle into a wait the button can count down", async () => {
    resend.mockResolvedValueOnce({
      error: new Error('For security purposes, you can only request this after 42 seconds.'),
    });

    await expect(resendConfirmation('a@b.com')).resolves.toEqual({
      error: 'Please wait 42 seconds before asking for another email.',
      retryAfterSeconds: 42,
    });
  });

  it('maps any other failure to a safe message', async () => {
    resend.mockResolvedValueOnce({ error: new Error('Failed to fetch') });

    const result = await resendConfirmation('a@b.com');
    expect(result.error).toMatch(/could not reach the server/i);
    expect(result.retryAfterSeconds).toBeUndefined();
  });
});
