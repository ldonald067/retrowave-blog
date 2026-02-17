import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AgeVerificationProps {
  onVerified: (birthYear: number, tosAccepted: boolean) => void;
  requireTOS?: boolean;
  loading?: boolean;
}

export default function AgeVerification({ onVerified, requireTOS = true, loading = false }: AgeVerificationProps) {
  const currentYear = new Date().getFullYear();
  const [birthYear, setBirthYear] = useState<string>('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState<string>('');

  // Generate year options (ages 13-100)
  const yearOptions: number[] = [];
  for (let year = currentYear - 13; year >= currentYear - 100; year--) {
    yearOptions.push(year);
  }

  const calculateAge = (year: number): number => {
    return currentYear - year;
  };

  const handleSubmit = () => {
    setError('');

    if (!birthYear) {
      setError('Please select your birth year');
      return;
    }

    const year = parseInt(birthYear);
    const age = calculateAge(year);

    // COPPA compliance - must be 13+
    if (age < 13) {
      setError('You must be at least 13 years old to use this service');
      return;
    }

    if (requireTOS && !tosAccepted) {
      setError('You must accept the Terms of Service to continue');
      return;
    }

    onVerified(year, tosAccepted);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-violet-50 to-fuchsia-50 z-50 overflow-hidden flex flex-col">
      {/* iOS-style Status Bar */}
      <div className="h-12 bg-transparent flex-shrink-0" />

      {/* iOS-style Header */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="w-16" /> {/* Spacer */}
          <h1 className="flex-1 text-center font-semibold text-gray-900">Age Verification</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      {/* Content - Scrollable area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {/* Welcome Section */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="text-5xl sm:text-6xl mb-4" aria-hidden="true">
                🛡️
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Verify Your Age</h2>
              <p className="text-sm sm:text-base text-gray-600">
                We need to confirm you're old enough to use this service
              </p>
            </div>

            <div className="space-y-4">
              {/* Birth Year Selector - iOS style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year</label>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Select your birth year...</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year} (Age {calculateAge(year)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Age Display */}
              {birthYear && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <p className="text-sm text-blue-800">
                    <CheckCircle size={16} className="inline mr-2" />
                    You are {calculateAge(parseInt(birthYear))} years old
                  </p>
                </motion.div>
              )}

              {/* Terms of Service Checkbox - iOS style */}
              {requireTOS && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="tos"
                    checked={tosAccepted}
                    onChange={(e) => setTosAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer rounded"
                  />
                  <label htmlFor="tos" className="text-sm text-gray-700 cursor-pointer flex-1">
                    I accept the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-medium hover:text-blue-800"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-medium hover:text-blue-800"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
              )}

              {/* COPPA Notice */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <AlertCircle size={14} className="inline mr-1" />
                  You must be at least 13 years old to use this service (COPPA compliance)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-800">
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                  </p>
                </motion.div>
              )}

              {/* Submit Button - iOS style */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                aria-label="Continue with age verification"
                className={`w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl hover:from-violet-600 hover:to-fuchsia-600 transition shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending magic link...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Your birth year is used only for age verification and is never shared publicly.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
