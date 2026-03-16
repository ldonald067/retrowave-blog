import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './ui';
import Toast from './Toast';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn, signInWithPassword } = useAuth();
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
      setEmailError('that doesn\'t look like an email');
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
        setPasswordError('wrong email or password');
      }
    } else {
      const { error } = await signIn(email);
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
        <Input
          label="ur email address:"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
          placeholder="you@example.com"
          error={emailError}
          autoFocus
        />

        {mode === 'password' && (
          <Input
            label="ur password:"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
            placeholder="shhh it's a secret..."
            error={passwordError}
          />
        )}

        {mode === 'password' ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode('magic'); clearErrors(); }}
              className="xanga-link text-xs min-h-[44px] inline-flex items-center justify-center"
            >
              ~ or use a magic link ~
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              💌 we'll email u a link — just click it 2 sign in!
            </p>
            <button
              type="button"
              onClick={() => { setMode('password'); clearErrors(); }}
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
              : '~ send magic link ~'}
        </button>
      </form>
    </motion.div>
    </>
  );
}
