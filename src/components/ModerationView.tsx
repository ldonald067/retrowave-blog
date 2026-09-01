import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errors';
import { withRetry } from '../lib/retry';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { formatDate } from '../utils/formatDate';

type Report = {
  report_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  post_id: string;
  post_title: string | null;
  post_excerpt: string | null;
  post_is_private: boolean | null;
  author_username: string | null;
  reporter_username: string | null;
  report_count: number;
};

const REASON_LABELS: Record<string, string> = {
  harassment: 'harassment or bullying',
  adult: 'adult or sexual content',
  violence: 'violence or self-harm',
  spam: 'spam or scam',
  other: 'something else',
};

interface ModerationViewProps {
  /** Report to scroll to, from the com.retrowave.journal://open#/report/<id> deep link. */
  focusReportId?: string | null;
  onGoHome: () => void;
}

/**
 * The operator's report queue.
 *
 * content_reports is unreadable through the API on purpose, so this screen is
 * the only in-app way to act on a report. Everything here goes through
 * admin_list_reports / admin_resolve_report, which refuse to run unless
 * is_admin() is true — the deep link that opens this screen carries a report id
 * and no authority of its own.
 */
export default function ModerationView({ focusReportId, onGoHome }: ModerationViewProps) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error: rpcError } = await withRetry(async () =>
        supabase.rpc('admin_list_reports', { p_status: 'open' })
      );
      if (rpcError) throw rpcError;
      setReports((data ?? []) as Report[]);
    } catch (err) {
      setError(toUserMessage(err));
      setReports([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(reportId: string, action: 'remove' | 'dismiss') {
    setBusyId(reportId);
    setError(null);
    try {
      const { error: rpcError } = await withRetry(async () =>
        supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_action: action })
      );
      if (rpcError) throw rpcError;
      setReports((prev) => (prev ?? []).filter((r) => r.report_id !== reportId));
      setNotice(action === 'remove' ? '~ entry hidden ~' : '~ report dismissed ~');
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (reports === null) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen themed-bg safe-area-top page-safe-bottom">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="xanga-title text-xl">🚩 ~ reports ~</h1>
          <button onClick={onGoHome} className="xanga-link text-xs">
            ~ back home ~
          </button>
        </div>

        {notice && (
          <p className="xanga-box p-3 mb-4 text-xs" style={{ color: 'var(--text-body)' }}>
            {notice}
          </p>
        )}
        {error && <ErrorMessage error={error} onRetry={load} />}

        {reports.length === 0 && !error && (
          <div className="xanga-box p-6 text-center">
            <p className="xanga-title text-base mb-1">~ nothing to review ~</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              no open reports. u&apos;re all caught up ✨
            </p>
          </div>
        )}

        {reports.map((r) => (
          <motion.div
            key={r.report_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="xanga-box p-4 mb-4"
            style={
              focusReportId === r.report_id
                ? { borderColor: 'var(--accent-primary)', borderWidth: 3 }
                : undefined
            }
          >
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-title)' }}>
              {REASON_LABELS[r.reason] ?? r.reason}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {/* formatDate, like every other surface. This was
                  toLocaleDateString(), the only use of it in the app, which
                  renders to the device locale — so `8/10/2026` is 8 October in
                  most of the world and 10 August in the US. Ambiguous anywhere,
                  and worst here: judging whether a report has been sitting open
                  is most of what this screen is for. */}
              reported by {r.reporter_username ? `@${r.reporter_username}` : 'anonymous'} ·{' '}
              {formatDate(r.created_at, 'MMM dd, yyyy')}
            </p>

            {r.report_count > 1 && (
              <p className="text-xs mb-2" style={{ color: 'var(--accent-primary)' }}>
                ⚠ {r.report_count} reports on this entry
              </p>
            )}
            {r.post_is_private && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                ✓ already hidden — not publicly visible
              </p>
            )}

            <div
              className="rounded p-3 mb-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
              }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                entry by {r.author_username ? `@${r.author_username}` : 'unknown'}
              </p>
              {/* The reported entry is the evidence — it is what an operator has
                  to read to judge the report — and it was `text-xs`, the same
                  size as the chrome around it. Below a text-xl page heading that
                  left the screen with one big thing and a flat field of 12px,
                  the same missing middle the entry detail had in `95aa9bb` and
                  the public profile card in `abe31f8`. `text-sm` was off-scale
                  besides: the tiers here are 1rem reading, 0.8125rem scanning,
                  text-xs chrome. */}
              <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-body)' }}>
                {r.post_title || '(no title)'}
              </p>
              <p
                className="prose-reading whitespace-pre-wrap"
                style={{ color: 'var(--text-body)', overflowWrap: 'anywhere' }}
              >
                {r.post_excerpt || '(content unavailable)'}
              </p>
            </div>

            {r.details && (
              <p className="text-xs mb-3" style={{ color: 'var(--text-body)' }}>
                <strong>note:</strong> {r.details}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => resolve(r.report_id, 'remove')}
                disabled={busyId === r.report_id}
                className="xanga-button text-xs px-4 py-2 min-h-[44px] flex-1"
              >
                {busyId === r.report_id ? '...' : '~ hide entry ~'}
              </button>
              <button
                onClick={() => resolve(r.report_id, 'dismiss')}
                disabled={busyId === r.report_id}
                className="px-4 py-2 rounded-lg text-xs font-bold border-2 border-dotted min-h-[44px] flex-1"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                  borderColor: 'var(--border-primary)',
                  fontFamily: 'var(--title-font)',
                }}
              >
                ~ dismiss ~
              </button>
            </div>
          </motion.div>
        ))}

        {/* Only when there is something to hide. With an empty queue this sat
            under `~ nothing to review ~` explaining an action the screen was no
            longer offering — visible for the first time once the last open
            report was dismissed. */}
        {reports.length > 0 && (
          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            hiding an entry makes it private. it is reversible and the author keeps their writing.
          </p>
        )}
      </div>
    </div>
  );
}
