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
