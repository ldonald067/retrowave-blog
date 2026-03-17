import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  it('starts with no toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast via showToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Hello', 'success', 5000);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Hello',
      type: 'success',
      duration: 5000,
    });
  });

  it('defaults to success type and 3000ms duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Default');
    });

    expect(result.current.toasts[0]?.type).toBe('success');
    expect(result.current.toasts[0]?.duration).toBe(3000);
  });

  it('removes a toast via hideToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Remove me');
    });

    const id = result.current.toasts[0]!.id;

    act(() => {
      result.current.hideToast(id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('success() shorthand creates success toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Yay');
    });

    expect(result.current.toasts[0]).toMatchObject({
      message: 'Yay',
      type: 'success',
    });
  });

  it('error() shorthand creates error toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Oops');
    });

    expect(result.current.toasts[0]).toMatchObject({
      message: 'Oops',
      type: 'error',
    });
  });

  it('info() shorthand creates info toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info('FYI');
    });

    expect(result.current.toasts[0]).toMatchObject({
      message: 'FYI',
      type: 'info',
    });
  });

  it('supports multiple concurrent toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('One');
      result.current.error('Two');
      result.current.info('Three');
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it('assigns unique ids to each toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('A');
      result.current.showToast('B');
    });

    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
