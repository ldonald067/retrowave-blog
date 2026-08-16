import { useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REPORT_REASONS, reportPublicPost, type ReportReason } from '../lib/reporting';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ReportDialogProps {
  postId: string;
  postTitle: string;
  onClose: () => void;
}

/**
 * In-app report flow (Apple Guideline 1.2).
 *
 * Shared by the signed-in feed and the public profile view. It lived inside
 * PublicProfileView for a while, which meant only the public surface ever got
 * the working flow — the feed was still handing Guideline 1.2 to a `mailto:`
 * anchor that does nothing in a WKWebView without a configured Mail account.
 *
 * Takes the post's id and title rather than a post object, because the two
 * callers have different row types and the dialog needs nothing else.
 *
 * Deliberately self-contained: the public view renders outside App's toast
 * layer, so success and failure are shown inline rather than through a toast
 * that would never appear. Works signed-out — the RPC accepts anonymous
 * reporters, which is what lets a visitor report without an account.
 */
export default function ReportDialog({ postId, postTitle, onClose }: ReportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFocusTrap(dialogRef, true, onClose);

  // Generated, not hardcoded: the feed renders one of these per card, so fixed
  // ids would collide the moment a second card mounted one.
  const titleId = useId();
  const detailsId = useId();

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await reportPublicPost(postId, reason, details);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSubmitted(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center p-4 modal-overlay-safe"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="xanga-box p-5 max-w-sm w-full overflow-y-auto modal-panel-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <>
              <h3 id={titleId} className="xanga-title text-lg mb-2">
                ~ thanks, we got it ~
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-body)' }}>
                This entry has been sent to us for review. We remove content that breaks the rules
                and can ban repeat offenders.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="xanga-button text-xs px-4 py-2 min-h-[44px] w-full"
              >
                ~ done ~
              </button>
            </>
          ) : (
            <>
              <h3 id={titleId} className="xanga-title text-lg mb-1">
                <span aria-hidden="true">🚩</span> ~ report this entry ~
              </h3>
              <p className="text-xs mb-3 break-words" style={{ color: 'var(--text-muted)' }}>
                &ldquo;{postTitle}&rdquo;
              </p>

              <fieldset className="mb-3">
                <legend className="text-xs mb-2" style={{ color: 'var(--text-body)' }}>
                  what&apos;s wrong with it?
                </legend>
                <div className="flex flex-col gap-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      aria-pressed={reason === r.value}
                      className="text-left px-3 py-2 rounded-lg border-2 border-dotted text-xs min-h-[44px]"
                      style={{
                        borderColor: 'var(--border-primary)',
                        backgroundColor:
                          reason === r.value
                            ? 'color-mix(in srgb, var(--accent-primary) 18%, var(--card-bg))'
                            : 'var(--card-bg)',
                        color: 'var(--text-body)',
                      }}
                    >
                      {reason === r.value ? '● ' : '○ '}
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label
                htmlFor={detailsId}
                className="text-xs block mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                anything else? (optional)
              </label>
              <textarea
                id={detailsId}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border-2 border-dotted p-2 text-xs mb-3"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                }}
              />

              {error && (
                <p className="text-xs mb-3" style={{ color: 'var(--accent-primary)' }} role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-bold border-2 border-dotted min-h-[44px]"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-muted)',
                    borderColor: 'var(--border-primary)',
                    fontFamily: 'var(--title-font)',
                  }}
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className="xanga-button text-xs px-4 py-2 min-h-[44px]"
                  style={{ opacity: !reason || submitting ? 0.5 : 1 }}
                >
                  {submitting ? '~ sending... ~' : '~ send report ~'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
