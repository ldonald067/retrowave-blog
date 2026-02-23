import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

const MAX_VISIBLE_TOASTS = 3;

/** Default durations by type — errors stay longer so users can read them */
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  error: 6000,
};

interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

let nextToastId = 0;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration?: number) => {
    const id = ++nextToastId;
    const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];
    setToasts((prev) => {
      const next = [...prev, { id, message, type, duration: resolvedDuration }];
      // Cap at max visible toasts — drop oldest
      if (next.length > MAX_VISIBLE_TOASTS) {
        return next.slice(next.length - MAX_VISIBLE_TOASTS);
      }
      return next;
    });
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    info,
  };
}
