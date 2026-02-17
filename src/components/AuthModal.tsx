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

  const canClose = false; // User must complete auth (set to true if you want to allow closing)

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
        className="fixed inset-0 bg-gradient-to-b from-violet-50 to-fuchsia-50 z-50 overflow-hidden flex flex-col"
      >
        {/* iOS-style Status Bar */}
        <div className="h-12 bg-transparent" />

        {/* iOS-style Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
          <div className="flex items-center justify-between px-4 h-14">
            {canClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-blue-600 font-medium"
              >
                <ChevronLeft size={20} />
                Back
              </button>
            )}
            <h1 className="flex-1 text-center font-semibold text-gray-900">
              {activeTab === 'signup' ? 'Create Account' : 'Sign In'}
            </h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-sm mx-auto min-h-full flex flex-col justify-center">
            {/* Tab Selector - iOS style segmented control */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6 sm:mb-8">
              <button
                onClick={() => setActiveTab('login')}
                aria-label="Sign In"
                aria-pressed={activeTab === 'login'}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition ${
                  activeTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                aria-label="Sign Up"
                aria-pressed={activeTab === 'signup'}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition ${
                  activeTab === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Welcome Message */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 sm:mb-8 text-center"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {activeTab === 'signup' ? 'Welcome!' : 'Welcome Back'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {activeTab === 'signup'
                  ? 'Create your account to start journaling'
                  : 'Sign in to continue your journey'}
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
