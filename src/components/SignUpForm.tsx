import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AgeVerification from './AgeVerification';
import { Input } from './ui';
import Toast from './Toast';
import { signUpWithPassword } from '../lib/auth-actions';
import { useToast } from '../hooks/useToast';
import { validatePassword } from '../lib/validation';
import { isNativePlatform } from '../lib/capacitor';

interface SignUpFormProps {
  /** Called when the address turns out to be registered, so the surrounding
      tabs can switch to sign-in with it already filled in. */
  onAccountExists?: (email: string) => void;
}

export default function SignUpForm({ onAccountExists }: SignUpFormProps = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'age' | 'success'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toasts, showToast, hideToast } = useToast();

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
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

    // Shared with the password-reset form, so the two cannot drift apart and
    // let through something the server then refuses.
    const passwordProblem = validatePassword(password);
    if (passwordProblem) {
      setPasswordError(passwordProblem);
      hasError = true;
    }

    if (hasError) return;
    setStep('age');
  };

  const handleAgeVerified = async (birthYear: number, tosAccepted: boolean) => {
    // Guard against lost form state (reload/remount between steps) — signing up
    // with empty credentials would create an anonymous ghost account.
    if (!email || !password) {
      showToast('oops, ur info got reset... enter ur email & password again', 'error');
      setStep('email');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, needsConfirmation, alreadyRegistered } = await signUpWithPassword(
        email,
        password,
        birthYear,
        tosAccepted
      );

      if (error) {
        showToast(error, 'error');
        setIsSubmitting(false);
        return;
      }

      if (alreadyRegistered) {
        // Supabase will not say whether an address is taken until a signup is
        // actually attempted — deliberately, so the signup form cannot be used
        // to test who has an account here. That means this can only ever be
        // discovered at the end, after the password and the age gate. Since the
        // news cannot arrive earlier, it at least arrives useful: carry the
        // address over to sign-in rather than emptying the form and leaving the
        // person to retype everything they just entered.
        showToast('u already have an account with this email! signing u in instead ~', 'info');
        onAccountExists?.(email);
        setStep('email');
        setIsSubmitting(false);
        return;
      }

      if (needsConfirmation) {
        setStep('success');
        return;
      }

      showToast('Account created! You are now signed in ✨', 'success');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setEmail('');
    setPassword('');
    clearErrors();
    setStep('email');
  };

  // Toast layer for server errors (age verification, sign-up failures)
  // — inline errors handle form validation instead
  const toastLayer = (
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
  );

  // Success screen (fallback — password sign-up usually auto-logs in)
  if (step === 'success') {
    return (
      <>
        {toastLayer}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center"
        >
          <div className="xanga-box p-6 mb-4">
            <div className="text-3xl sm:text-4xl mb-3">💌✨</div>
            <h2 className="xanga-title text-xl mb-2">~ almost there!! ~</h2>
            <p className="xanga-subtitle mb-1">we emailed a confirmation link 2:</p>
            <p className="font-semibold text-sm mt-1" style={{ color: 'var(--accent-primary)' }}>
              {email}
            </p>
            {/* Says where the link actually goes. It opens the website on every
                platform — see authRedirectTo — so promising the app would
                reopen would be the same lie in the other direction. */}
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              {isNativePlatform
                ? 'click it 2 confirm, then come back here & sign in ✨'
                : 'click it & u will be signed in ✨'}
            </p>
          </div>

          <button
            onClick={handleStartOver}
            className="xanga-link flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft size={12} />~ use a different email ~
          </button>
        </motion.div>
      </>
    );
  }

  if (step === 'age') {
    return (
      <>
        {toastLayer}
        <AgeVerification
          onVerified={handleAgeVerified}
          onBack={() => setStep('email')}
          requireTOS={true}
          loading={isSubmitting}
        />
      </>
    );
  }

  return (
    <>
      {toastLayer}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />

          {/* new-password, not current-password: this is the token that makes iOS
              offer to generate and save a strong password. Worth having, because
              Supabase enforces lower+upper+digit+symbol server-side — a suggested
              password satisfies that policy where a typed one often does not. */}
          <Input
            label="create a password:"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            placeholder="8+ chars w/ Aa, 123 & !?*..."
            error={passwordError}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="xanga-button w-full py-2.5 text-sm"
          >
            {isSubmitting ? 'sending...' : '~ continue ~'}
          </button>
        </form>
      </motion.div>
    </>
  );
}
