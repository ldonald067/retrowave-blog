import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap } from 'lucide-react';
import AgeVerification from './AgeVerification';
import { Input } from './ui';
import Toast from './Toast';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PASSWORD_MIN_LENGTH } from '../lib/validation';

// Check if we're in development mode
const isDev = import.meta.env.DEV;

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'age' | 'success'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBirthYear, setSavedBirthYear] = useState<number>(2000);
  const [savedTosAccepted, setSavedTosAccepted] = useState<boolean>(true);
  const { signUpWithPassword, devSignUp } = useAuth();
  const { toasts, showToast, hideToast } = useToast();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      showToast(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'error');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      showToast('Password must contain both letters and numbers', 'error');
      return;
    }
    setStep('age');
  };

  const handleAgeVerified = async (birthYear: number, tosAccepted: boolean) => {
    setIsSubmitting(true);
    setSavedBirthYear(birthYear);
    setSavedTosAccepted(tosAccepted);

    try {
      // DEV: Use anonymous auth to bypass email entirely
      if (isDev && devSignUp) {
        const { error } = await devSignUp(email, birthYear, tosAccepted);
        if (error) {
          showToast(error, 'error');
          setIsSubmitting(false);
          return;
        }
        showToast('Account created! Logging you in...', 'success');
        return;
      }

      // PROD: Use password-based sign-up
      const { error } = await signUpWithPassword(email, password, birthYear, tosAccepted);

      if (error) {
        showToast(error, 'error');
        setIsSubmitting(false);
        return;
      }

      showToast('Account created! You are now signed in ✨', 'success');
    } catch (err) {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DEV ONLY: Quick signup that bypasses magic link
  const handleDevSignUp = async () => {
    if (!devSignUp) return;
    setIsSubmitting(true);
    const { error } = await devSignUp(email, savedBirthYear, savedTosAccepted);

    if (error) {
      showToast(error, 'error');
      setIsSubmitting(false);
    } else {
      showToast('Account created! Logging you in...', 'success');
    }
  };

  const handleStartOver = () => {
    setEmail('');
    setPassword('');
    setStep('email');
  };

  // Render toast notifications — this component uses its own useToast() state
  // because it renders inside AuthModal's early return where App-level toasts
  // aren't mounted. Each return path includes this toast layer.
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
      <>{toastLayer}<motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center"
      >
        <div className="xanga-box p-6 mb-4">
          <div className="text-3xl sm:text-4xl mb-3">✨🎉</div>
          <h2 className="xanga-title text-xl mb-2">~ ur account is ready!! ~</h2>
          <p className="xanga-subtitle mb-1">signed up as:</p>
          <p className="font-semibold text-sm mt-1" style={{ color: 'var(--accent-primary)' }}>{email}</p>
        </div>

        {/* DEV ONLY */}
        {isDev && (
          <div className="mb-4">
            <button
              onClick={handleDevSignUp}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap size={18} />
              {isSubmitting ? 'Creating Account...' : 'Dev: Create Account Now'}
            </button>
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              (dev only - bypasses email verification)
            </p>
          </div>
        )}

        <button
          onClick={handleStartOver}
          className="xanga-link flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowLeft size={12} />
          ~ use a different email ~
        </button>
      </motion.div></>
    );
  }

  if (step === 'age') {
    return <>{toastLayer}<AgeVerification onVerified={handleAgeVerified} requireTOS={true} loading={isSubmitting} /></>;
  }

  return (
    <>{toastLayer}<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <Input
          label="ur email address:"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />

        <Input
          label="create a password:"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8+ chars, letters & numbers..."
          required
        />

        <div className="xanga-box p-3">
          <p className="text-xs" style={{ color: 'var(--text-body)' }}>
            🔑 pick a password with letters & numbers 2 create ur account!
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="xanga-button w-full py-2.5 text-sm"
        >
          {isSubmitting ? 'sending...' : '~ continue ~'}
        </button>
      </form>
    </motion.div></>
  );
}
