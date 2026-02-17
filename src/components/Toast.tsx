import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import type { ToastType } from '../hooks/useToast';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <AlertCircle size={20} />,
  };

  const colors: Record<ToastType, string> = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-rose-500',
    info: 'from-[#00ffff] to-[#ff00ff]',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-4 right-4 z-[100] max-w-md"
      >
        <div
          role="alert"
          aria-live={type === 'error' ? 'assertive' : 'polite'}
          className={`flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r ${colors[type]} rounded-lg shadow-[0_0_20px_rgba(255,0,255,0.5)] backdrop-blur-sm`}
        >
          <div className="flex items-center gap-3">
            <span className="text-white">{icons[type]}</span>
            <p className="text-white font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notification"
            className="text-white hover:bg-white/20 rounded p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
