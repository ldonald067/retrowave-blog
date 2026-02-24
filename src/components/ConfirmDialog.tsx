import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '~ yes, do it ~',
  cancelLabel = 'cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onCancel);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="xanga-box p-5 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="confirm-dialog-title"
            className="xanga-title text-lg mb-2"
          >
            ⚠️ {title}
          </h3>

          <p
            id="confirm-dialog-message"
            className="text-sm mb-5"
            style={{ color: 'var(--text-body)' }}
          >
            {message}
          </p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg transition text-xs font-bold border-2 border-dotted hover:opacity-80"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-muted)',
                borderColor: 'var(--border-primary)',
                fontFamily: 'var(--title-font)',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg transition text-xs font-bold border-2 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary), color-mix(in srgb, var(--accent-secondary) 80%, #000))',
                color: 'var(--button-text, #ffffff)',
                borderColor: 'var(--accent-secondary)',
                fontFamily: 'var(--title-font)',
                boxShadow: '0 2px 8px color-mix(in srgb, var(--accent-secondary) 40%, transparent)',
              }}
            >
              {loading ? '~ working... ~' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
