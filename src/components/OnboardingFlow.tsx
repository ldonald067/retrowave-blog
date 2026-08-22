import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface OnboardingFlowProps {
  /** Which auth tab to land on — the intro ends by choosing one, not by exiting to nothing. */
  onComplete: (tab: 'signup' | 'login') => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true);

  const previewDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const slides = [
    {
      emoji: '✨📓✨',
      title: '~ Your Personal Xanga ~',
      description:
        'a private space 2 capture ur thoughts, feelings, & memories. ur story, ur way. just like the good old days~',
      decoration: '· _ · _ · _ ·  ♡  · _ · _ · _ ·',
    },
    {
      emoji: '💕🎵✨',
      title: '~ Express Yourself ~',
      description:
        'add mood tags & what ur listening 2 on every post. paste a youtube link 2 share ur fav songs. make it *~totally u~*',
      decoration: '★·.·´¯`·.·★ ♫ ★·.·´¯`·.·★',
    },
    {
      emoji: '🎨✨🌈',
      title: '~ Make It Ur Own ~',
      description:
        'choose from 8 unique themes 2 match ur vibe: emo dark, scene kid, cottage core & more. pick an emoji style 2. ur journal = ur rules.',
      decoration: '- - - ♥ - - - ♥ - - -',
    },
    // The last beat is a look at the thing itself rather than a fourth
    // description of it. `~ let's get started!! ~` used to sit here and said the
    // same thing as the button underneath it.
    {
      kind: 'preview' as const,
      emoji: '📓✨',
      title: '~ ur journal is waiting ~',
      description: 'this is what ur xanga looks like on day one. make an account & fill it in ♡',
      decoration: '·411·.·´¯`·.·★ OMG ★·.·´¯`·.411·',
    },
  ];

  // Only advances. The last slide has its own explicit signup/sign-in buttons
  // rather than a "next" that quietly means "done".
  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const slide = slides[currentStep];
  const isLastSlide = currentStep === slides.length - 1;
  const isFirstSlide = currentStep === 0;

  if (!slide) return null;

  const variants = {
    enter: (dir: number) => ({
      x: dir === 0 ? 0 : dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 xanga-auth-bg z-50 overflow-hidden flex flex-col"
    >
      {/* Xanga-style header */}
      <div
        className="flex-shrink-0 border-b-2 border-dotted py-2 px-4 safe-area-top"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--text-title)', fontFamily: 'var(--title-font)' }}
          >
            ✨ welcome 2 xanga ✨
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
          >
            step {currentStep + 1} of {slides.length}
          </span>
        </div>
      </div>

      {/* Step indicator - Xanga style dotted line */}
      <div
        className="flex-shrink-0 py-2 px-4 border-b border-dotted"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div
          className="max-w-md mx-auto flex gap-1"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={slides.length}
          aria-label={`Step ${currentStep + 1} of ${slides.length}`}
        >
          {slides.map((_, index) => (
            <div
              key={index}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  index <= currentStep ? 'var(--accent-primary)' : 'var(--border-primary)',
                opacity: index <= currentStep ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden keyboard-safe-pad px-3 sm:px-6 py-6 sm:py-8 flex flex-col items-center short-viewport-start">
        <div className="onboarding-panel" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial={direction === 0 ? 'center' : 'enter'}
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full max-w-full"
            >
              {/* Slide content as xanga-box */}
              <div className="xanga-box p-4 sm:p-8 text-center min-w-0 max-w-full overflow-hidden">
                {/* Emoji illustration */}
                <motion.div
                  initial={direction === 0 ? false : { scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                  className="onboarding-wrap text-3xl sm:text-5xl mb-4 tracking-widest"
                >
                  {slide.emoji}
                </motion.div>

                {/* Decorative divider */}
                <p
                  className="onboarding-wrap text-xs mb-4 tracking-wider"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
                >
                  {slide.decoration}
                </p>

                {/* Title */}
                <motion.h2
                  initial={direction === 0 ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="onboarding-wrap xanga-title text-base sm:text-xl mb-3"
                >
                  {slide.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={direction === 0 ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="onboarding-wrap onboarding-copy text-xs sm:text-sm leading-relaxed"
                  style={{ color: 'var(--text-body)' }}
                >
                  {slide.description}
                </motion.p>

                {/* A look at the empty journal, on the last slide only.
                    Inert on purpose: this is a picture of what an account gets
                    you, not a journal you are in. It used to be reachable for
                    real by dismissing the auth screen, where an "@guest" shell
                    offered to write an entry and then bounced you to signup. */}
                {slide.kind === 'preview' && (
                  <motion.div
                    initial={direction === 0 ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mt-4 rounded-lg border-2 border-dotted p-3 text-left select-none"
                    style={{
                      borderColor: 'var(--border-primary)',
                      backgroundColor: 'var(--card-bg)',
                    }}
                    aria-hidden="true"
                  >
                    <p className="xanga-title text-sm text-center mb-2">
                      ~ your journal is empty ~
                    </p>
                    <div
                      className="border-t border-dotted pt-2 text-xs leading-relaxed"
                      style={{ borderColor: 'var(--border-primary)', color: 'var(--text-body)' }}
                    >
                      <p style={{ color: 'var(--text-muted)' }}>{previewDate}</p>
                      <p className="mt-1">every xanga needs a first entry...</p>
                      <p>what&apos;s on ur mind? 💭</p>
                    </div>
                    <p
                      className="text-center text-xs mt-3 tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      · _ · _ · _ · ♡ · _ · _ · _ ·
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation - Xanga style */}
      <div
        className="flex-shrink-0 border-t-2 border-dotted py-4 px-4 sm:px-6 safe-area-bottom"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="max-w-md mx-auto space-y-3">
          {/* The last slide ends the intro, so it stops looking like a carousel
              and starts looking like a decision: one loud primary action, and
              signing in spelled out underneath for people who already have an
              account. Mid-intro it stays "next »" with a quiet skip. */}
          {isLastSlide ? (
            <>
              <button
                onClick={() => onComplete('signup')}
                className="xanga-button w-full py-3 text-sm font-bold"
              >
                ✨ ~ create ur xanga ~ ✨
              </button>
              <div className="text-center">
                <span className="text-xs" style={{ color: 'var(--text-body)' }}>
                  already got one?{' '}
                </span>
                <button
                  onClick={() => onComplete('login')}
                  className="xanga-link text-xs font-bold"
                >
                  ~ sign in ~
                </button>
              </div>
              {!isFirstSlide && (
                <div className="text-center">
                  <button
                    onClick={handlePrevious}
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    « back
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {!isFirstSlide && (
                  <button
                    onClick={handlePrevious}
                    className="xanga-button py-2.5 px-4 text-sm flex-shrink-0"
                  >
                    « back
                  </button>
                )}
                <button onClick={handleNext} className="xanga-button py-2.5 text-sm flex-1">
                  next »
                </button>
              </div>
              <div className="text-center">
                <button onClick={() => onComplete('signup')} className="xanga-link text-xs">
                  ~ skip intro ~
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
