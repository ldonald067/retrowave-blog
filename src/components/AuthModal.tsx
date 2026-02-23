import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import SignUpForm from './SignUpForm';
import LoginForm from './LoginForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);

  // Update activeTab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  const canClose = false;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or sign up"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 xanga-auth-bg z-50 overflow-hidden flex flex-col"
      >
        {/* Xanga-style Header */}
        <div
          className="flex-shrink-0 border-b-2 border-dotted"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            {canClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 xanga-link"
              >
                <ChevronLeft size={16} />
                back
              </button>
            )}
            <h1 className="flex-1 text-center xanga-title text-lg">
              ✨ {activeTab === 'signup' ? 'Create Your Xanga' : 'Sign In'} ✨
            </h1>
            <div className="w-16" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-sm mx-auto min-h-full flex flex-col justify-center">
            {/* Xanga-style Tab Selector */}
            <div
              className="flex border-2 border-dotted rounded-lg overflow-hidden mb-6"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <button
                onClick={() => setActiveTab('login')}
                aria-label="Sign In"
                aria-pressed={activeTab === 'login'}
                className="flex-1 py-2 px-3 font-bold text-xs sm:text-sm transition"
                style={{
                  fontFamily: 'var(--title-font)',
                  backgroundColor: activeTab === 'login' ? 'var(--button-gradient-from)' : 'var(--card-bg)',
                  color: activeTab === 'login' ? 'var(--text-title)' : 'var(--text-muted)',
                }}
              >
                ~ Sign In ~
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                aria-label="Sign Up"
                aria-pressed={activeTab === 'signup'}
                className="flex-1 py-2 px-3 font-bold text-xs sm:text-sm transition border-l-2 border-dotted"
                style={{
                  fontFamily: 'var(--title-font)',
                  borderColor: 'var(--border-primary)',
                  backgroundColor: activeTab === 'signup' ? 'var(--button-gradient-from)' : 'var(--card-bg)',
                  color: activeTab === 'signup' ? 'var(--text-title)' : 'var(--text-muted)',
                }}
              >
                ~ Sign Up ~
              </button>
            </div>

            {/* Welcome Message */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-center"
            >
              <h2 className="xanga-title text-xl sm:text-2xl mb-2">
                {activeTab === 'signup' ? '~ welcome! ~' : '~ welcome back ~'}
              </h2>
              <p className="xanga-subtitle">
                {activeTab === 'signup'
                  ? 'create ur account 2 start journaling'
                  : 'sign in 2 continue ur journey'}
              </p>
            </motion.div>

            {/* Form Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'login' ? <LoginForm /> : <SignUpForm />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
