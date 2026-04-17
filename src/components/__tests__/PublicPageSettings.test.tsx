import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PublicPageSettings from '../PublicPageSettings';

describe('PublicPageSettings', () => {
  it('asks users to review before publishing', () => {
    const onRequestPublish = vi.fn();

    render(
      <PublicPageSettings
        enabled={false}
        savedEnabled={false}
        publicUrl={null}
        copied={false}
        onRequestPublish={onRequestPublish}
        onUnpublish={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('private by default')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /review and publish page/i }));
    expect(onRequestPublish).toHaveBeenCalledOnce();
  });

  it('shows copy and view actions for a saved public page', () => {
    render(
      <PublicPageSettings
        enabled
        savedEnabled
        publicUrl="https://example.com/#/u/jane"
        copied={false}
        onRequestPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('public page on')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/#/u/jane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy public link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view public page/i })).toHaveAttribute(
      'href',
      'https://example.com/#/u/jane',
    );
  });

  it('shows a pending-save notice before the page is live', () => {
    render(
      <PublicPageSettings
        enabled
        savedEnabled={false}
        publicUrl="https://example.com/#/u/jane"
        copied={false}
        onRequestPublish={vi.fn()}
        onUnpublish={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('Save changes to publish this page.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view public page/i })).not.toBeInTheDocument();
  });
});
