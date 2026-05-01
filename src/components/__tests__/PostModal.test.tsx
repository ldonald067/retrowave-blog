import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PostModal from '../PostModal';
import type { Post } from '../../types/post';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileHover: _wh,
      whileTap: _wt,
      drag: _d,
      dragConstraints: _dc,
      dragElastic: _de,
      dragSnapToOrigin: _ds,
      onDragEnd: _od,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileHover: _wh,
      whileTap: _wt,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('../../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

vi.mock('../../hooks/useYouTubeInfo', () => ({
  useYouTubeInfo: vi.fn(() => null),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock('rehype-sanitize', () => ({
  default: vi.fn(),
}));

const mockPost: Post = {
  id: '1',
  user_id: 'user-1',
  title: 'Test Post',
  content: 'Test content here',
  author: 'TestUser',
  chapter: 'test chapter',
  mood: '😊 happy',
  music: 'test song',
  is_private: false,
  has_media: false,
  created_at: '2026-03-15T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z',
  content_truncated: false,
  reactions: {},
  user_reactions: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('PostModal ⋮ Menu', () => {
  const defaultProps = {
    post: mockPost,
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    mode: 'edit' as const,
    isOwner: true,
    onDelete: vi.fn(),
  };

  it('shows ⋮ button in edit mode', () => {
    render(<PostModal {...defaultProps} />);
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });

  it('shows ⋮ button in create mode', () => {
    render(<PostModal {...defaultProps} mode="create" post={null} />);
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });

  it('does not show ⋮ button in view mode', () => {
    render(<PostModal {...defaultProps} mode="view" />);
    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
  });

  it('opens dropdown menu when ⋮ is clicked', () => {
    render(<PostModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows privacy toggle in dropdown', () => {
    render(<PostModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('menuitem', { name: /make private/ })).toBeInTheDocument();
  });

  it('shows entry privacy in the editor body', () => {
    render(<PostModal {...defaultProps} mode="create" post={null} />);

    expect(screen.getByText(/entry privacy/i)).toBeInTheDocument();
    expect(screen.getByText('Only you can see this entry.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^public$/i }));

    expect(screen.getByText('Can appear on your public page.')).toBeInTheDocument();
  });

  it('saves new entries as private by default', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PostModal {...defaultProps} mode="create" post={null} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/entry title/i), {
      target: { value: 'Private draft' },
    });
    fireEvent.change(screen.getByLabelText(/ur thoughts/i), {
      target: { value: 'This one starts private.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save private entry/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Private draft',
          content: 'This one starts private.',
          is_private: true,
        }),
      );
    });
  });

  it('shows delete option in edit mode for owner', () => {
    render(<PostModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('menuitem', { name: /delete entry/ })).toBeInTheDocument();
  });

  it('hides delete option in create mode', () => {
    render(<PostModal {...defaultProps} mode="create" post={null} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.queryByRole('menuitem', { name: /delete entry/ })).not.toBeInTheDocument();
  });

  it('hides delete option when not owner', () => {
    render(<PostModal {...defaultProps} isOwner={false} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.queryByRole('menuitem', { name: /delete entry/ })).not.toBeInTheDocument();
  });

  it('toggles privacy when clicking make private', () => {
    render(<PostModal {...defaultProps} />);
    // Initially public - open menu and click make private
    fireEvent.click(screen.getByLabelText('More options'));
    fireEvent.click(screen.getByRole('menuitem', { name: /make private/ }));

    // Menu should close and footer should show private badge
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getAllByText(/private/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows make public after toggling to private', () => {
    render(<PostModal {...defaultProps} />);
    // Toggle to private
    fireEvent.click(screen.getByLabelText('More options'));
    fireEvent.click(screen.getByRole('menuitem', { name: /make private/ }));

    // Now open menu again - should say "make public"
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('menuitem', { name: /make public/ })).toBeInTheDocument();
  });

  it('calls onDelete when delete is clicked', () => {
    const onDelete = vi.fn();
    render(<PostModal {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('More options'));
    fireEvent.click(screen.getByRole('menuitem', { name: /delete entry/ }));
    expect(onDelete).toHaveBeenCalledWith(mockPost);
  });

  it('has correct aria attributes on ⋮ button', () => {
    render(<PostModal {...defaultProps} />);
    const btn = screen.getByLabelText('More options');
    expect(btn).toHaveAttribute('aria-haspopup', 'true');
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('PostModal Footer', () => {
  const defaultProps = {
    post: mockPost,
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    mode: 'edit' as const,
    isOwner: true,
  };

  it('shows cancel and save buttons in edit mode', () => {
    render(<PostModal {...defaultProps} />);
    expect(screen.getByText('cancel')).toBeInTheDocument();
    expect(screen.getByText('~ save changes ~')).toBeInTheDocument();
  });

  it('shows private badge in footer when post is private', () => {
    render(<PostModal {...defaultProps} post={{ ...mockPost, is_private: true }} />);
    // The footer shows a read-only 🔒 private badge
    const badges = screen.getAllByText(/private/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show footer in view mode', () => {
    render(<PostModal {...defaultProps} mode="view" />);
    expect(screen.queryByText('cancel')).not.toBeInTheDocument();
    expect(screen.queryByText('~ save changes ~')).not.toBeInTheDocument();
  });

  it('lets owners switch from read mode into edit mode explicitly', () => {
    const onEdit = vi.fn();
    render(<PostModal {...defaultProps} mode="view" onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit entry/i }));

    expect(onEdit).toHaveBeenCalledWith(mockPost);
  });

  it('uses publish/save labels that match the entry privacy in create mode', () => {
    render(<PostModal {...defaultProps} mode="create" post={null} />);

    expect(screen.getByText('~ save private entry ~')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^public$/i }));

    expect(screen.getByText('~ publish entry ~')).toBeInTheDocument();
  });
});

describe('PostModal Draft Storage', () => {
  const createModeProps = {
    post: null,
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    mode: 'create' as const,
  };

  it('restores drafts for the matching user only', () => {
    localStorage.setItem(
      'post-draft:user-1',
      JSON.stringify({ title: 'User One Draft', content: 'Private draft body' })
    );

    render(<PostModal {...createModeProps} draftUserId="user-1" />);

    expect(screen.getByLabelText(/entry title/i)).toHaveValue('User One Draft');
    expect(screen.getByLabelText(/ur thoughts/i)).toHaveValue('Private draft body');
  });

  it('does not restore another user’s draft', () => {
    localStorage.setItem(
      'post-draft:user-1',
      JSON.stringify({ title: 'User One Draft', content: 'Private draft body' })
    );

    render(<PostModal {...createModeProps} draftUserId="user-2" />);

    expect(screen.getByLabelText(/entry title/i)).toHaveValue('');
    expect(screen.getByLabelText(/ur thoughts/i)).toHaveValue('');
  });
});
