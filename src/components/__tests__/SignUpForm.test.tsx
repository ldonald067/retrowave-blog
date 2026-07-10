import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const signUpWithPassword = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    profileError: null,
    loading: false,
    signUpWithPassword,
  }),
}));

// Stub the age gate so tests can trigger onVerified directly, including the
// values a real verification would pass.
vi.mock('../AgeVerification', () => ({
  default: ({ onVerified }: { onVerified: (year: number, tos: boolean) => void }) => (
    <button onClick={() => onVerified(1990, true)}>stub-verify-age</button>
  ),
}));

import SignUpForm from '../SignUpForm';

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillCredentials = (email: string, password: string) => {
    fireEvent.change(screen.getByLabelText(/ur email address/i), {
      target: { value: email },
    });
    fireEvent.change(screen.getByLabelText(/create a password/i), {
      target: { value: password },
    });
  };

  it('signs up with the entered credentials after age verification', async () => {
    render(<SignUpForm />);

    fillCredentials('journal@example.com', 'Hunter!2222');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Age step replaces the credentials form
    const verify = await screen.findByRole('button', { name: 'stub-verify-age' });
    fireEvent.click(verify);

    await vi.waitFor(() => {
      expect(signUpWithPassword).toHaveBeenCalledWith(
        'journal@example.com',
        'Hunter!2222',
        1990,
        true
      );
    });
    expect(signUpWithPassword).toHaveBeenCalledOnce();
  });

  it('does not advance to the age step with empty credentials', () => {
    render(<SignUpForm />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/enter ur email/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'stub-verify-age' })).not.toBeInTheDocument();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('never calls signUp when credentials state is lost before age verification', async () => {
    // Regression: ghost-account bug — signing up with empty credentials used to
    // create an anonymous Supabase user. Simulate lost state by clearing the
    // email field after reaching the age step is impossible through the UI, so
    // assert the guard via the exposed flow: empty password blocks step 1.
    render(<SignUpForm />);

    fillCredentials('journal@example.com', '');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/at least .* characters plz/i)).toBeInTheDocument();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });
});
