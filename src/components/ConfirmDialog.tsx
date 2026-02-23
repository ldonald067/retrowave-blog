import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '~ yes, do it ~',
  cancelLabel = 'cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="xanga-box p-5 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            className="xanga-title text-lg mb-2"
          >
            ⚠️ {title}
          </h3>

          <p
            className="text-sm mb-5"
            style={{ color: 'var(--text-body)' }}
          >
            {message}
          </p>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg transition text-xs font-bold border-2 border-dotted"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-body)',
                borderColor: 'var(--border-primary)',
                fontFamily: 'var(--title-font)',
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg transition text-xs font-bold border-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 20%, var(--card-bg))',
                color: 'var(--accent-secondary)',
                borderColor: 'var(--accent-secondary)',
                fontFamily: 'var(--title-font)',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
