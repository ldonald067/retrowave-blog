import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Zap } from 'lucide-react';
import AgeVerification from './AgeVerification';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Input, Button, Card } from './ui';

// Check if we're in development mode
const isDev = import.meta.env.DEV;

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'age' | 'success'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBirthYear, setSavedBirthYear] = useState<number>(2000);
  const [savedTosAccepted, setSavedTosAccepted] = useState<boolean>(true);
  const { signUp, devSignUp } = useAuth();
  const { showToast } = useToast();

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
    setStep('age');
  };

  const handleAgeVerified = async (birthYear: number, tosAccepted: boolean) => {
    setIsSubmitting(true);
    setSavedBirthYear(birthYear);
    setSavedTosAccepted(tosAccepted);

    try {
      const { error } = await signUp(email, birthYear, tosAccepted);

      if (error) {
        showToast(error, 'error');
        setIsSubmitting(false);
        return;
      }

      setStep('success');
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
      // The auth state change will automatically redirect
    }
  };

  const handleStartOver = () => {
    setEmail('');
    setStep('email');
  };

  // Success screen after signup
  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center"
      >
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email! 📬</h2>
          <p className="text-gray-600">
            We sent a magic link to:
          </p>
          <p className="font-semibold text-purple-600 mt-1">{email}</p>
        </div>

        <Card variant="info" className="mb-6">
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-left text-sm">
              <p className="font-medium text-gray-900 mb-1">Next steps:</p>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Open your email inbox</li>
                <li>Find the email from us (check spam too!)</li>
                <li>Click the magic link to sign in</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* DEV ONLY: Quick account creation button */}
        {isDev && (
          <div className="mb-4">
            <button
              onClick={handleDevSignUp}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap size={18} />
              {isSubmitting ? 'Creating Account...' : '⚡ Dev: Create Account Now'}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              (Dev only - bypasses email verification)
            </p>
          </div>
        )}

        <button
          onClick={handleStartOver}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowLeft size={14} />
          Use a different email
        </button>
      </motion.div>
    );
  }

  if (step === 'age') {
    return <AgeVerification onVerified={handleAgeVerified} requireTOS={true} loading={isSubmitting} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <form onSubmit={handleEmailSubmit} className="space-y-6">
        <Input
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />

        <Card variant="info">
          <p className="text-sm">💌 We'll send you a magic link - no password needed!</p>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Continue
        </Button>
      </form>
    </motion.div>
  );
}
