import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { updatePassword } = vi.hoisted(() => ({
  updatePassword: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../../lib/auth-actions', () => ({ updatePassword }));

import NewPasswordModal from '../NewPasswordModal';

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: /save new password/i }));

describe('NewPasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePassword.mockResolvedValue({ error: null });
  });

  it('sets the new password and reports back', async () => {
    const onDone = vi.fn();
    render(<NewPasswordModal onDone={onDone} />);

    fill(/^new password:$/i, 'Hunter!2222');
    fill(/^type it again:$/i, 'Hunter!2222');
    submit();

    await vi.waitFor(() => expect(updatePassword).toHaveBeenCalledWith('Hunter!2222'));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('enforces the same policy as signup, before hitting the server', () => {
    render(<NewPasswordModal onDone={vi.fn()} />);

    // Supabase rejects this server-side. Catching it here keeps the message
    // attached to a field instead of arriving as a bare API error.
    fill(/^new password:$/i, 'alllowercase');
    fill(/^type it again:$/i, 'alllowercase');
    submit();

    expect(screen.getByText(/UPPER & lower letters/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('catches a mistyped confirmation', () => {
    render(<NewPasswordModal onDone={vi.fn()} />);

    fill(/^new password:$/i, 'Hunter!2222');
    fill(/^type it again:$/i, 'Hunter!2223');
    submit();

    expect(screen.getByText(/those 2 dont match/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('keeps the form open when the server refuses', async () => {
    updatePassword.mockResolvedValueOnce({
      error: 'Your session has expired. Please sign in again.',
    });
    const onDone = vi.fn();
    render(<NewPasswordModal onDone={onDone} />);

    fill(/^new password:$/i, 'Hunter!2222');
    fill(/^type it again:$/i, 'Hunter!2222');
    submit();

    // The recovery session can lapse. Closing on failure would strand someone
    // signed in with the old password and no way back to this screen.
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
