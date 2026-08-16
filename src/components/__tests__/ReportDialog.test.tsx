import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { reportPublicPost } = vi.hoisted(() => ({
  reportPublicPost: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../../lib/reporting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/reporting')>();
  return { ...actual, reportPublicPost };
});

import ReportDialog from '../ReportDialog';

describe('ReportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportPublicPost.mockResolvedValue({ error: null });
  });

  it('files the report through the RPC that writes a row', async () => {
    render(<ReportDialog postId="post-123" postTitle="A Title" onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /send report/i }));

    // The whole point of this component: a durable row, never a mailto: anchor,
    // which is a silent no-op in a WKWebView with no Mail account configured.
    await vi.waitFor(() => expect(reportPublicPost).toHaveBeenCalled());
    expect(reportPublicPost.mock.calls[0]![0]).toBe('post-123');
  });

  it('confirms to the reporter that it landed', async () => {
    render(<ReportDialog postId="post-123" postTitle="A Title" onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /send report/i }));

    // Silence after reporting is what the mailto path gave people.
    expect(await screen.findByText(/thanks, we got it/i)).toBeInTheDocument();
  });

  it('surfaces a failure instead of claiming success', async () => {
    reportPublicPost.mockResolvedValueOnce({
      error: 'Network error. Please check your connection.',
    });
    render(<ReportDialog postId="post-123" postTitle="A Title" onClose={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /send report/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
    expect(screen.queryByText(/thanks, we got it/i)).not.toBeInTheDocument();
  });

  it('will not send without a reason', () => {
    render(<ReportDialog postId="post-123" postTitle="A Title" onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /send report/i })).toBeDisabled();
  });
});
