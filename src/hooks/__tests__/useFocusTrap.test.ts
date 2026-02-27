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

function dispatchKeyDown(
  target: HTMLElement,
  key: string,
  shiftKey = false,
): void {
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
