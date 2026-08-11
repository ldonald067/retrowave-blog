import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { signInWithPassword, signInMagicLink } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInMagicLink: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../../lib/auth-actions', () => ({
  signInWithPassword,
  signInMagicLink,
}));

import LoginForm from '../LoginForm';

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('LoginForm error surfacing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells an unconfirmed user to check their inbox instead of blaming credentials', async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: 'Please verify your email before signing in.',
    });
    render(<LoginForm />);
    fill(/ur email address/i, 'a@b.com');
    fill(/ur password/i, 'Secret!123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/confirmation link first/i)).toBeInTheDocument();
    expect(screen.queryByText(/wrong email or password/i)).not.toBeInTheDocument();
  });

  it('shows "wrong email or password" only for actual invalid credentials', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: 'Incorrect email or password.' });
    render(<LoginForm />);
    fill(/ur email address/i, 'a@b.com');
    fill(/ur password/i, 'nope');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/wrong email or password/i)).toBeInTheDocument();
  });

  it('surfaces network/other errors verbatim rather than as bad credentials', async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: 'Network error. Please check your connection.',
    });
    render(<LoginForm />);
    fill(/ur email address/i, 'a@b.com');
    fill(/ur password/i, 'Secret!123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    expect(screen.queryByText(/wrong email or password/i)).not.toBeInTheDocument();
  });
});

describe('LoginForm iOS AutoFill', () => {
  /**
   * iOS Password AutoFill only offers to fill a form when the autocomplete
   * tokens name a recognised pair, and it is the pairing that matters:
   * username + current-password means "sign in", so a wrong token here reads as
   * a sign-up form and the keyboard's password strip stays empty. Asserted here
   * rather than in the browser pane because the sign-in panel sits behind an
   * AnimatePresence swap, which cannot complete while a tab is hidden.
   */
  it('marks the pair iOS recognises as a sign-in', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/ur email address/i)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/ur password/i)).toHaveAttribute(
      'autocomplete',
      'current-password'
    );
  });

  it('stops WKWebView capitalising the first letter of an address', () => {
    render(<LoginForm />);
    const email = screen.getByLabelText(/ur email address/i);

    expect(email).toHaveAttribute('autocapitalize', 'none');
    expect(email).toHaveAttribute('autocorrect', 'off');
  });
});
