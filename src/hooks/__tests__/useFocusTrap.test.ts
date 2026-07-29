import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

// Helper to create a container with focusable elements
function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  const btn1 = document.createElement('button');
  btn1.textContent = 'First';
  const btn2 = document.createElement('button');
  btn2.textContent = 'Second';
  const btn3 = document.createElement('button');
  btn3.textContent = 'Third';
  container.appendChild(btn1);
  container.appendChild(btn2);
  container.appendChild(btn3);
  document.body.appendChild(container);
  return container;
}

function dispatchKeyDown(target: HTMLElement, key: string, shiftKey = false): void {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  // Clean up DOM after each test
  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('focuses first focusable element when active', () => {
    const buttons = container.querySelectorAll('button');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, true);
    });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('does nothing when not active', () => {
    const prevFocus = document.activeElement;

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, false);
    });

    // Focus should not have moved
    expect(document.activeElement).toBe(prevFocus);
  });

  it('Tab wraps from last element to first', () => {
    const buttons = container.querySelectorAll('button');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, true);
    });

    // Focus the last button
    buttons[2]!.focus();
    expect(document.activeElement).toBe(buttons[2]);

    // Press Tab on the container (event bubbles from activeElement)
    dispatchKeyDown(container, 'Tab');

    // Should wrap to first
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('Shift+Tab wraps from first element to last', () => {
    const buttons = container.querySelectorAll('button');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, true);
    });

    // First button should be focused after activation
    expect(document.activeElement).toBe(buttons[0]);

    // Press Shift+Tab
    dispatchKeyDown(container, 'Tab', true);

    // Should wrap to last
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('Escape calls onEscape callback', () => {
    const onEscape = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, true, onEscape);
    });

    dispatchKeyDown(container, 'Escape');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not steal focus when onEscape changes identity', () => {
    // Regression: PostModal re-creates its onEscape on every keystroke (its
    // isDirty dep chain includes the field values). When the focus effect
    // depended on the key handler, each character re-ran it and yanked focus
    // to the first focusable element — so only one character could be typed.
    const buttons = container.querySelectorAll('button');

    const { rerender } = renderHook(
      ({ onEscape }: { onEscape: () => void }) => {
        const ref = useRef<HTMLElement>(container);
        useFocusTrap(ref, true, onEscape);
      },
      { initialProps: { onEscape: () => {} } }
    );

    // User tabs/clicks to a field that is not the first focusable element
    buttons[1]!.focus();
    expect(document.activeElement).toBe(buttons[1]);

    // A keystroke gives onEscape a brand-new identity
    rerender({ onEscape: () => {} });

    // Focus must stay where the user put it
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('still handles Escape after onEscape changes identity', () => {
    // The listener must track the latest callback even though the focus
    // effect no longer re-runs on identity changes.
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ onEscape }: { onEscape: () => void }) => {
        const ref = useRef<HTMLElement>(container);
        useFocusTrap(ref, true, onEscape);
      },
      { initialProps: { onEscape: first } }
    );

    rerender({ onEscape: second });
    dispatchKeyDown(container, 'Escape');

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('restores previous focus on unmount', () => {
    // Create an external element to have focus before trap
    const externalButton = document.createElement('button');
    externalButton.textContent = 'External';
    document.body.appendChild(externalButton);
    externalButton.focus();
    expect(document.activeElement).toBe(externalButton);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, true);
    });

    // Focus should have moved into the trap
    const firstButton = container.querySelector('button');
    expect(document.activeElement).toBe(firstButton);

    // Unmount should restore focus
    unmount();
    expect(document.activeElement).toBe(externalButton);

    // Cleanup
    document.body.removeChild(externalButton);
  });
});
