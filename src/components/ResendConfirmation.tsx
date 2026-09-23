import { useEffect, useState } from 'react';
import { resendConfirmation } from '../lib/auth-actions';

/** Supabase's own per-address limit; counting it down beats failing into it. */
export const RESEND_COOLDOWN_SECONDS = 60;

interface ResendConfirmationProps {
  email: string;
}

/**
 * "resend the email" for an account whose confirmation link is lost or stale.
 *
 * Links expire after an hour, and without this someone who opened the email
 * late had no way forward: sign-in said "verify your email" and stopped. Shown
 * after sign-up and wherever sign-in finds the address unconfirmed.
 */
export default function ResendConfirmation({ email }: ResendConfirmationProps) {
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    const { error, retryAfterSeconds } = await resendConfirmation(email);
    setSending(false);
    if (error) {
      setMessage({ text: error, tone: 'error' });
      if (retryAfterSeconds) setSecondsLeft(retryAfterSeconds);
      return;
    }
    setMessage({ text: 'sent!! check ur inbox (& spam). the link works 4 an hour', tone: 'ok' });
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  };

  const waiting = secondsLeft > 0;

  return (
    <div className="mt-3 flex flex-col gap-2 text-center">
      {/* Secondary tier, not a link. It is the one thing this person needs next
          and it *does* something — sends an email — while the links around it
          only navigate. As .xanga-link it was the third identical underlined
          line in a column (SE, 2026-09-22). See "Pick the tier by what the
          control does" in /frontend. */}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={sending || waiting || !email}
        className="xanga-button-ghost title-bold w-full px-4 py-2 text-xs min-h-[44px] disabled:opacity-60"
      >
        {sending
          ? 'sending...'
          : waiting
            ? `~ resend again in ${secondsLeft}s ~`
            : '💌 resend the confirmation email'}
      </button>
      {/* Its own live region: the countdown in the button would otherwise be
          read aloud every second. */}
      <p
        role="status"
        className={`text-xs ${message?.tone === 'error' ? 'font-bold' : ''}`}
        style={{
          color: message?.tone === 'error' ? 'var(--accent-secondary)' : 'var(--text-body)',
        }}
      >
        {message?.text}
      </p>
    </div>
  );
}
