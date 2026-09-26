import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Profile } from '../../types/profile';

// Real framer-motion on purpose: the bug this guards only exists with
// AnimatePresence mode="wait", where the next step mounts after the old one has
// animated out. The main ProfileSetup suite stubs motion and cannot see it.
vi.mock('../../lib/celebrations', () => ({ sparkleBurst: vi.fn(), emojiRain: vi.fn() }));
vi.mock('../../lib/username', () => ({ isUsernameAvailable: vi.fn().mockResolvedValue(true) }));

import ProfileSetup from '../ProfileSetup';

const profile = {
  id: 'user-1',
  username: 'rainbowpudding1',
  display_name: null,
  theme: null,
  avatar_url: null,
  username_changed_at: null,
} as unknown as Profile;

describe('ProfileSetup focus between steps', () => {
  it('lands on the new step heading once the old step has gone', async () => {
    render(<ProfileSetup profile={profile} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Glitter' } });
    fireEvent.click(screen.getByRole('button', { name: '~ next ~' }));

    const heading = await screen.findByRole(
      'heading',
      { name: /pick ur vibe/i },
      { timeout: 3000 }
    );
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.queryByRole('heading', { name: /what should we call u/i })
    ).not.toBeInTheDocument();
  });
});
