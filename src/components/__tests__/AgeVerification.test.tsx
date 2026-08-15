import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AgeVerification from '../AgeVerification';

describe('AgeVerification', () => {
  it('offers a way back out', () => {
    const onBack = vi.fn();
    render(<AgeVerification onVerified={vi.fn()} onBack={onBack} />);

    // This screen is a fixed, full-viewport overlay. With no exit, someone who
    // mistyped their email on the previous step had to finish the age gate
    // before they could correct it.
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it('renders without a back button when no handler is given', () => {
    render(<AgeVerification onVerified={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
  });

  it('keeps the 13+ gate intact', () => {
    const onVerified = vi.fn();
    render(<AgeVerification onVerified={onVerified} onBack={vi.fn()} />);

    // Guarding the COPPA rule alongside the new control: a back button must not
    // become a way around the gate.
    fireEvent.click(screen.getByRole('button', { name: /verify|continue/i }));

    expect(onVerified).not.toHaveBeenCalled();
    expect(screen.getByText(/select your birth year/i)).toBeInTheDocument();
  });
});
