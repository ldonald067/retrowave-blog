import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './ui';
import Toast from './Toast';
import { requestPasswordReset, signInMagicLink, signInWithPassword } from '../lib/auth-actions';
import { useToast } from '../hooks/useToast';

interface LoginFormProps {
  /** Pre-fills the address, so someone bounced here from signup does not
      retype what they just entered. */
  initialEmail?: string;
}

export default function LoginForm({ initialEmail = '' }: LoginFormProps = {}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic' | 'reset'>('password');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toasts, showToast, hideToast } = useToast();

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!email) {
      setEmailError('enter ur email');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("that doesn't look like an email");
      hasError = true;
    }

    if (mode === 'password' && !password) {
      setPasswordError('enter ur password');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);

    if (mode === 'password') {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        // Surface the real reason instead of always blaming credentials.
        // With email confirmation on, an unconfirmed user has the RIGHT
        // password — telling them it's wrong sends them into reset loops.
        if (/verify your email|not confirmed/i.test(error)) {
          setPasswordError('check ur inbox 4 the confirmation link first ✨');
        } else if (/incorrect email or password/i.test(error)) {
          setPasswordError('wrong email or password');
        } else {
          setPasswordError(error);
        }
      }
    } else if (mode === 'reset') {
      const { error } = await requestPasswordReset(email);
      if (error) {
        showToast(error, 'error');
      } else {
        // Says "if" on purpose. Confirming that an address has an account would
        // make this form a way to test who has one here.
        showToast('if that email has an account, a reset link is on its way ✨', 'success');
        setEmail('');
        setMode('password');
      }
    } else {
      const { error } = await signInMagicLink(email);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Check your email for the magic link!', 'success');
        setEmail('');
      }
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
            duration={toast.duration}
            index={index}
          />
        ))}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* autoComplete is what makes iOS Password AutoFill and iCloud Keychain
              offer to fill this pair; without it the strip above the keyboard
              stays empty and every returning user types their password by hand.
              "username" rather than "email" — that is the token AutoFill pairs
              with current-password. autoCapitalize is off because WKWebView will
              otherwise capitalise the first letter of an address. */}
          <Input
            label="ur email address:"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            placeholder="you@example.com"
            error={emailError}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />

          {mode === 'password' && (
            <Input
              label="ur password:"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="shhh it's a secret..."
              error={passwordError}
              autoComplete="current-password"
            />
          )}

          {mode === 'password' ? (
            /* These two are not peers and should not look like peers. A magic
               link is another way to do the thing you came to do; a reset is
               what you reach for when that has failed. Rendered identically and
               stacked, they read as one list of equal options and you have to
               read both to find the one you want. The magic link keeps the link
               styling; the reset is quieter, set apart by a rule, and reads as
               a fallback. */
            <div className="text-center flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setMode('magic');
                  clearErrors();
                }}
                className="xanga-link text-xs min-h-[44px] inline-flex items-center justify-center"
              >
                ~ or use a magic link ~
              </button>
              <div
                className="border-t border-dotted mx-auto w-2/3 my-1"
                style={{ borderColor: 'var(--border-primary)' }}
              />
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  clearErrors();
                }}
                className="text-xs min-h-[44px] inline-flex items-center justify-center underline underline-offset-2 transition hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                forgot ur password?
              </button>
            </div>
          ) : mode === 'reset' ? (
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                🔑 we&apos;ll email u a link 2 pick a new one
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  clearErrors();
                }}
                className="xanga-link text-xs mt-1 min-h-[44px] inline-flex items-center justify-center"
              >
                ~ back 2 signing in ~
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                💌 we'll email u a link, just click it 2 sign in!
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  clearErrors();
                }}
                className="xanga-link text-xs mt-1 min-h-[44px] inline-flex items-center justify-center"
              >
                ~ or use a password ~
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="xanga-button w-full py-2.5 text-sm"
          >
            {isSubmitting
              ? 'sending...'
              : mode === 'password'
                ? '~ sign in ~'
                : mode === 'reset'
                  ? '~ send reset link ~'
                  : '~ send magic link ~'}
          </button>
        </form>
      </motion.div>
    </>
  );
}
