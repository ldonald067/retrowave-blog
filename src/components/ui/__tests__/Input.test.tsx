import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '../Input';

describe('Input aria-describedby', () => {
  it('links a caller-supplied hint', () => {
    render(
      <>
        <Input aria-label="Username" aria-describedby="hint" readOnly />
        <p id="hint">u can change ur username again on oct 22</p>
      </>
    );
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
      'u can change ur username again on oct 22'
    );
  });

  it('keeps the error linked when a hint is linked too', () => {
    // A caller's aria-describedby used to be spread over the error's, so
    // linking a hint silently unlinked the error.
    render(
      <>
        <Input aria-label="Username" aria-describedby="hint" error="pick a username" />
        <p id="hint">ur @handle</p>
      </>
    );
    const description = screen.getByLabelText('Username').getAttribute('aria-describedby');
    expect(description?.split(' ')).toHaveLength(2);
    expect(description).toContain('hint');
  });
});
