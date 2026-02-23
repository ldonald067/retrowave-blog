import { useState } from 'react';
import { motion } from 'framer-motion';

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
    <div className="fixed inset-0 xanga-auth-bg z-50 overflow-hidden flex flex-col">
      {/* Xanga-style header bar */}
      <div
        className="flex-shrink-0 border-b-2 border-dotted py-2 px-4"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h1
          className="text-center text-sm font-bold"
          style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
        >
          ✨ age verification ✨
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {/* Welcome Section */}
            <div className="xanga-box p-4 sm:p-6 mb-4 text-center">
              <div className="text-4xl sm:text-5xl mb-3" aria-hidden="true">🛡️✨</div>
              <h2
                className="xanga-title text-lg sm:text-xl mb-2"
              >
                ~ verify ur age ~
              </h2>
              <p className="xanga-subtitle text-xs">
                we need 2 confirm ur old enough 2 use this
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Birth Year Selector */}
              <div className="xanga-box p-3 sm:p-4">
                <label
                  className="block text-xs font-bold mb-2"
                  style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
                >
                  📅 birth year:
                </label>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border-2 border-dotted transition appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-body)',
                  }}
                >
                  <option value="">select ur birth year...</option>
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
                  className="xanga-box p-3"
                >
                  <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                    ✅ u are {calculateAge(parseInt(birthYear))} years old
                  </p>
                </motion.div>
              )}

              {/* Terms of Service Checkbox */}
              {requireTOS && (
                <div className="xanga-box p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="tos"
                      checked={tosAccepted}
                      onChange={(e) => setTosAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <label
                      htmlFor="tos"
                      className="text-xs cursor-pointer flex-1"
                      style={{ color: 'var(--text-body)' }}
                    >
                      i accept the{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="xanga-link"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="xanga-link"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
              )}

              {/* COPPA Notice */}
              <div className="xanga-box p-3">
                <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                  ⚠️ u must b at least 13 years old 2 use this service (COPPA compliance)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="xanga-box p-3"
                  style={{ borderColor: 'var(--accent-secondary)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--accent-secondary)' }}>
                    ❌ {error}
                  </p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                aria-label="Continue with age verification"
                className={`xanga-button w-full py-2.5 sm:py-3 text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? '~ sending magic link... ~' : '~ continue ~'}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                ur birth year is used only 4 age verification and is never shared publicly 🔒
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
