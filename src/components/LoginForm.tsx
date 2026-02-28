import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from './ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const { signIn, signInWithPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setIsSubmitting(true);

    if (mode === 'password') {
      if (!password) {
        showToast('Please enter your password', 'error');
        setIsSubmitting(false);
        return;
      }
      const { error } = await signInWithPassword(email, password);
      if (error) {
        showToast(error, 'error');
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ur email address:"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />

        {mode === 'password' && (
          <Input
            label="ur password:"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="shhh it's a secret..."
            required
          />
        )}

        {mode === 'password' ? (
          <div className="xanga-box p-3">
            <p className="text-xs" style={{ color: 'var(--text-body)' }}>
              🔑 sign in with ur email & password
            </p>
            <button
              type="button"
              onClick={() => setMode('magic')}
              className="xanga-link text-xs mt-1 min-h-[44px] flex items-center"
            >
              ~ or use a magic link ~
            </button>
          </div>
        ) : (
          <div className="xanga-box p-3">
            <p className="text-xs mb-1" style={{ color: 'var(--text-body)' }}>
              💌 we'll email u a magic link - just click it 2 sign in!
            </p>
            <button
              type="button"
              onClick={() => setMode('password')}
              className="xanga-link text-xs mt-1 min-h-[44px] flex items-center"
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
  );
}
