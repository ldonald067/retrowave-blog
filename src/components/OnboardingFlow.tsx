import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const slides = [
    {
      emoji: '✨📓✨',
      title: '~ Your Personal Xanga ~',
      description:
        'a private space 2 capture ur thoughts, feelings, & memories. ur story, ur way. just like the good old days~',
      decoration: '· _ · _ · _ ·  ♡  · _ · _ · _ ·',
    },
    {
      emoji: '💕🎵📸',
      title: '~ Express Yourself ~',
      description:
        'add music, videos, photos, & mood tags 2 ur posts. set ur current mood & what ur listening 2. make it *~totally u~*',
      decoration: '★·.·´¯`·.·★ ♫ ★·.·´¯`·.·★',
    },
    {
      emoji: '🔒✨🛡️',
      title: '~ Ur Space, Ur Rules ~',
      description:
        'make posts public or private. share only what u want, when u want. no surprises, no drama. ur journal = ur rules.',
      decoration: '- - - ♥ - - - ♥ - - -',
    },
    {
      emoji: '🌟💻🌟',
      title: "~ let's get started!! ~",
      description:
        "ur xanga is ready & waiting 4 u!! pick a theme, set ur status, & start writing. it's gonna b gr8 ♡",
      decoration: '·411·.·´¯`·.·★ OMG ★·.·´¯`·.411·',
    },
  ];

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
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
      x: dir > 0 ? 300 : -300,
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
    <div className="fixed inset-0 xanga-auth-bg z-50 overflow-hidden flex flex-col">
      {/* Xanga-style header */}
      <div
        className="flex-shrink-0 border-b-2 border-dotted py-2 px-4"
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
        <div className="max-w-md mx-auto flex gap-1">
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
      <div className="flex-1 overflow-hidden px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              {/* Slide content as xanga-box */}
              <div className="xanga-box p-5 sm:p-8 text-center">
                {/* Emoji illustration */}
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                  className="text-4xl sm:text-5xl mb-4 tracking-widest"
                >
                  {slide.emoji}
                </motion.div>

                {/* Decorative divider */}
                <p
                  className="text-xs mb-4 tracking-wider"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--title-font)' }}
                >
                  {slide.decoration}
                </p>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="xanga-title text-lg sm:text-xl mb-3"
                >
                  {slide.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-xs sm:text-sm leading-relaxed"
                  style={{ color: 'var(--text-body)' }}
                >
                  {slide.description}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation - Xanga style */}
      <div
        className="flex-shrink-0 border-t-2 border-dotted py-4 px-4 sm:px-6"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="max-w-md mx-auto space-y-3">
          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstSlide && (
              <button
                onClick={handlePrevious}
                className="xanga-button py-2.5 px-4 text-sm flex-shrink-0"
              >
                « back
              </button>
            )}
            <button
              onClick={handleNext}
              className="xanga-button py-2.5 text-sm flex-1"
            >
              {isLastSlide ? '~ start writing!! ~' : 'next »'}
            </button>
          </div>

          {/* Skip link */}
          {!isLastSlide && (
            <div className="text-center">
              <button
                onClick={onComplete}
                className="xanga-link text-xs"
              >
                ~ skip intro ~
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
