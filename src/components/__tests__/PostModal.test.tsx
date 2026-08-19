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
    }: React.PropsWithChildren<
      React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>
    >) => <button {...props}>{children}</button>,
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

  it('does not show ⋮ button in create mode', () => {
    // Delete is the menu's only item, so create mode has nothing to open.
    render(<PostModal {...defaultProps} mode="create" post={null} />);
    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
  });

  it('does not show ⋮ button when the viewer is not the owner', () => {
    render(<PostModal {...defaultProps} isOwner={false} />);
    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
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

  it('does not duplicate the privacy control in the dropdown', () => {
    // Privacy lives in one place — the toggle in the editor body. The menu
    // used to carry a second control for the same state, visible at the same
    // time as the toggle it duplicated.
    render(<PostModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(
      screen.queryByRole('menuitem', { name: /make (private|public)/ })
    ).not.toBeInTheDocument();
  });

  it('shows entry privacy in the editor body', () => {
    render(<PostModal {...defaultProps} mode="create" post={null} />);

    expect(screen.getByText(/entry privacy/i)).toBeInTheDocument();
    expect(screen.getByText('Only you can see this entry.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^public$/i }));

    expect(screen.getByText('Can appear on your public page.')).toBeInTheDocument();
  });

  it('states privacy exactly once in the editor', () => {
    // Guards the redundancy this pass removed: heading, badge, toggle pair and
    // a footer chip all asserted the same state on one screen.
    render(<PostModal {...defaultProps} mode="create" post={null} />);
    // The toggle's own "private" button, and nothing else, apart from the
    // heading and the save button which name the action rather than repeat it.
    expect(screen.getAllByText(/^private$/i)).toHaveLength(1);
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
        })
      );
    });
  });

  it('shows delete option in edit mode for owner', () => {
    render(<PostModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('More options'));
    expect(screen.getByRole('menuitem', { name: /delete entry/ })).toBeInTheDocument();
  });

  it('toggles privacy from the editor body', () => {
    render(<PostModal {...defaultProps} />);
    // mockPost is public, so the public side starts pressed.
    expect(screen.getByRole('button', { name: /^public$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: /^private$/i }));

    expect(screen.getByRole('button', { name: /^private$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^public$/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('describes the consequence of the selected privacy side', () => {
    render(<PostModal {...defaultProps} />);
    expect(screen.getByText('Can appear on your public page.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^private$/i }));

    expect(screen.getByText('Only you can see this entry.')).toBeInTheDocument();
    expect(screen.queryByText('Can appear on your public page.')).not.toBeInTheDocument();
  });

  it('labels the privacy toggle as a group', () => {
    render(<PostModal {...defaultProps} />);
    expect(screen.getByRole('group', { name: /entry privacy/i })).toBeInTheDocument();
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

  it('reflects a private post on the toggle, without a second footer badge', () => {
    render(<PostModal {...defaultProps} post={{ ...mockPost, is_private: true }} />);
    expect(screen.getByRole('button', { name: /^private$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // The footer used to carry a read-only 🔒 private chip repeating this.
    expect(screen.getAllByText(/^private$/i)).toHaveLength(1);
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
