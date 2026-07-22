import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AgeVerification from './AgeVerification';
import { Input } from './ui';
import Toast from './Toast';
import { signUpWithPassword } from '../lib/auth-actions';
import { useToast } from '../hooks/useToast';
import { PASSWORD_MIN_LENGTH } from '../lib/validation';

export default function SignUpForm() {
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

    // Mirrors the Supabase password policy: lower + upper + digit + symbol.
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`at least ${PASSWORD_MIN_LENGTH} characters plz`);
      hasError = true;
    } else if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^a-zA-Z0-9]/.test(password)
    ) {
      setPasswordError('needs UPPER & lower letters, a number & a symbol');
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
        showToast('u already have an account with this email! try signing in instead', 'error');
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
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              click it, then come back & sign in ✨
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
        <AgeVerification onVerified={handleAgeVerified} requireTOS={true} loading={isSubmitting} />
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
            autoFocus
          />

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
