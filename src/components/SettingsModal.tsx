import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Pepicon } from './ui';
import {
  Windows95MyComputer,
  FloppyDisk,
  Windows95RecycleBin,
} from 'react-old-icons';
import ConfirmDialog from './ConfirmDialog';
import { SWIPE_DISMISS_THRESHOLD } from '../lib/constants';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import { hapticImpact } from '../lib/capacitor';
import { requireAuth } from '../lib/auth-guard';

interface SettingsModalProps {
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function SettingsModal({ onClose, onSuccess, onError }: SettingsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true, onClose);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const auth = await requireAuth();
      if (auth.error) { onError?.(auth.error); return; }

      const { data, error } = await withRetry(async () =>
        supabase.rpc('export_user_data'),
      );
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-journal-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess?.('~ ur data has been exported! ~');
    } catch (err) {
      onError?.(toUserMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      const auth = await requireAuth();
      if (auth.error) { onError?.(auth.error); return; }

      const { error } = await withRetry(async () =>
        supabase.rpc('delete_user_account'),
      );
      if (error) throw error;

      await hapticImpact();

      // Sign out after account deletion — triggers auth state change
      await supabase.auth.signOut();

      onSuccess?.('~ ur account has been deleted. farewell friend ~');
      onClose();
    } catch (err) {
      onError?.(toUserMessage(err));
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Account settings"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.5 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_DISMISS_THRESHOLD) {
              onClose();
            }
          }}
          className="rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
          style={{
            backgroundColor: 'var(--modal-bg)',
            border: '4px solid var(--modal-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-3 sm:p-4 border-b-2 border-dotted"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="xanga-title text-lg sm:text-2xl flex items-center gap-2">
                <Pepicon name="gear" size={18} color="var(--accent-primary)" />
                ~ settings ~
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="xanga-subtitle mt-1">~ manage ur account ~</p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Export My Data */}
            <div className="xanga-box p-4">
              <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                <Windows95MyComputer size={20} alt="" />
                data
              </h3>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 border-dotted transition hover:opacity-80 min-h-[44px]"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                  borderColor: 'var(--border-primary)',
                  fontFamily: 'var(--title-font)',
                }}
              >
                <FloppyDisk size={18} alt="" />
                {exporting ? '~ exporting... ~' : '~ export my data ~'}
              </motion.button>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                download all ur posts, reactions & profile as a json file
              </p>
            </div>

            {/* Delete Account — danger zone */}
            <div className="xanga-box p-4">
              <h3 className="xanga-title text-base sm:text-lg mb-3 flex items-center gap-2">
                <Windows95RecycleBin size={20} alt="" />
                danger zone
              </h3>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition hover:opacity-80 min-h-[44px]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
                  color: 'var(--accent-secondary)',
                  borderColor: 'var(--accent-secondary)',
                  fontFamily: 'var(--title-font)',
                }}
              >
                ~ delete account ~
              </motion.button>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                this will permanently delete ur account & all ur data. this can't be undone!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="p-3 sm:p-4 border-t-2 border-dotted flex justify-end modal-footer-safe"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition text-xs font-bold border-2 border-dotted min-h-[44px]"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-body)',
                borderColor: 'var(--border-primary)',
                fontFamily: 'var(--title-font)',
              }}
            >
              close
            </button>
          </div>
        </motion.div>

        {/* Delete Account Confirmation */}
        {showDeleteConfirm && (
          <ConfirmDialog
            title="~ delete account? ~"
            message="this will permanently delete ur account, all ur posts, reactions & data. this can NOT be undone. r u absolutely sure?"
            confirmLabel="~ yes, delete everything ~"
            loading={deleteAccountLoading}
            onConfirm={handleDeleteAccount}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
