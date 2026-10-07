import { useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** 'danger' for confirmations that destroy something: delete, block, discard. */
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '~ yes, do it ~',
  cancelLabel = 'cancel',
  loading = false,
  tone = 'default',
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center p-4 modal-overlay-safe"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
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
          className="xanga-box p-5 max-w-sm w-full overflow-y-auto modal-panel-safe"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="confirm-dialog-title"
            className="xanga-title text-lg mb-2"
            // balance, so a wrapped title does not leave its closing ~ alone on
            // the last line, which reads as a typo — same fix as the intro.
            style={{ textWrap: 'balance' }}
          >
            <span aria-hidden="true">⚠️</span> {title}
          </h3>

          <div
            id="confirm-dialog-message"
            className="text-sm mb-5"
            style={{ color: 'var(--text-body)' }}
          >
            {message}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
            <motion.button
              type="button"
              onClick={onCancel}
              disabled={loading}
              whileTap={{ scale: 0.95 }}
              // Outline tier, not grey: .xanga-button-ghost is accent text on
              // --card-bg with a dotted border — the same shape this button had,
              // without draining it to --text-muted. No grey controls (gotchas).
              className="xanga-button-ghost title-bold w-full sm:w-auto px-4 py-2.5 text-xs min-h-[44px]"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {cancelLabel}
            </motion.button>
            <motion.button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              whileTap={{ scale: 0.95 }}
              // .xanga-button, so a confirm matches every other primary — it was
              // a smaller serif, and its accent-secondary "destructive" border
              // vanished on cottage-core and grunge. Danger swaps the fill for
              // --link-caution under --card-bg text: the pair every caution link
              // already clears (4.77:1 at worst), read in reverse. Amber is used
              // for nothing else, so delete cannot pass for save or publish.
              className="xanga-button w-full sm:w-auto"
              style={{
                // .xanga-button:disabled fades to 0.5; "~ working... ~" stays legible.
                opacity: 1,
                ...(tone === 'danger' && {
                  background: 'var(--link-caution)',
                  borderColor: 'var(--link-caution)',
                  color: 'var(--card-bg)',
                }),
              }}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block' }}
                  >
                    ✦
                  </motion.span>
                  ~ working... ~
                </span>
              ) : (
                confirmLabel
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
