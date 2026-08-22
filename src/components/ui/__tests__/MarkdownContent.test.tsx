import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MarkdownContent from '../MarkdownContent';

/**
 * Deliberately does NOT mock react-markdown.
 *
 * `PostCard.test.tsx` and `PostModal.test.tsx` both mock it, so neither would
 * notice if the lazy chunk stopped resolving — the Suspense fallback renders the
 * same text, so a permanently-broken renderer looks identical to a working one
 * in those suites. These tests exist to catch that.
 */
describe('MarkdownContent', () => {
  it('renders markdown once the chunk resolves', async () => {
    render(<MarkdownContent>{'**bold** and *italic*'}</MarkdownContent>);

    await waitFor(() => expect(document.querySelector('strong')).toBeInTheDocument());
    expect(document.querySelector('strong')).toHaveTextContent('bold');
    expect(document.querySelector('em')).toHaveTextContent('italic');
  });

  // No test for the Suspense fallback: Vite has the module resolved by the time
  // the first assertion runs, so the fallback is not observable here and any
  // test of it would be asserting a timing accident rather than behaviour. It is
  // plain text of the same string — the risk it carries is cosmetic, and the
  // failure mode that actually matters (chunk never resolves) is covered above.

  it('sanitizes embedded HTML rather than trusting post content', async () => {
    render(<MarkdownContent>{'<img src=x onerror="alert(1)">ok'}</MarkdownContent>);

    await waitFor(() => expect(screen.getByText(/ok/)).toBeInTheDocument());
    // rehype-sanitize must still be applied through the lazy boundary.
    expect(document.querySelector('img[onerror]')).toBeNull();
  });

  it('passes wrapper classes and styles through', async () => {
    const { container } = render(
      <MarkdownContent className="prose prose-sm" style={{ color: 'rgb(1, 2, 3)' }}>
        {'text'}
      </MarkdownContent>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('prose', 'prose-sm');
    expect(wrapper.style.color).toBe('rgb(1, 2, 3)');
    await waitFor(() => expect(screen.getByText('text')).toBeInTheDocument());
  });
});
