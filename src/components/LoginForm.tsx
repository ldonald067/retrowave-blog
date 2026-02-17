import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Input, Button, Card } from './ui';

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
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail size={20} />}
          required
          autoFocus
        />

        {mode === 'password' && (
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            icon={<Lock size={20} />}
            required
          />
        )}

        {mode === 'password' ? (
          <Card variant="info">
            <p className="text-sm">
              🔑 Sign in with your email and password.
            </p>
            <button
              type="button"
              onClick={() => setMode('magic')}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              Use magic link instead
            </button>
          </Card>
        ) : (
          <Card variant="info">
            <p className="text-sm mb-2">
              <strong>How it works:</strong>
            </p>
            <p className="text-xs opacity-90">
              We'll email you a magic link. Click it and you'll be automatically signed in.
            </p>
            <button
              type="button"
              onClick={() => setMode('password')}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              Use password instead
            </button>
          </Card>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {mode === 'password' ? 'Sign In' : 'Send Magic Link'}
        </Button>
      </form>
    </motion.div>
  );
}
