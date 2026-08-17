import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './ui';
import { updatePassword } from '../lib/auth-actions';
import { validatePassword } from '../lib/validation';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface NewPasswordModalProps {
  onDone: (message: string) => void;
}

/**
 * The second half of password recovery.
 *
 * Opened by a recovery callback, never by the user, which is why it has no
 * cancel: the link already established a session, so dismissing this would
 * leave someone signed in without ever setting the password they came to set —
 * and with no way back to this screen short of requesting another email.
 *
 * The recovery session is what authorises the change, so it has to happen here
 * and now rather than being deferred to settings.
 */
export default function NewPasswordModal({ onDone }: NewPasswordModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useFocusTrap(dialogRef, true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Same rule as signup, from one shared validator — if the two drift, the
    // server rejects a password the form accepted and the error has no field
    // to attach to.
    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (password !== confirm) {
      setError('those 2 dont match');
      return;
    }

    setSaving(true);
    const { error: err } = await updatePassword(password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onDone('~ password changed! ur signed in ~');
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center p-4 modal-overlay-safe"
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-password-title"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="xanga-box p-5 max-w-sm w-full h-fit overflow-y-auto modal-panel-safe"
        >
          <h2 id="new-password-title" className="xanga-title text-lg mb-1">
            <span aria-hidden="true">🔑</span> ~ pick a new password ~
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            almost done — choose something u&apos;ll remember this time ♡
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="new password:"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="8+ chars w/ Aa, 123 & !?*..."
              autoComplete="new-password"
              autoFocus
            />
            <Input
              label="type it again:"
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              placeholder="one more time ~"
              autoComplete="new-password"
              error={error}
            />

            <button
              type="submit"
              disabled={saving}
              className="xanga-button w-full text-sm min-h-[44px]"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '~ saving... ~' : '~ save new password ~'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
