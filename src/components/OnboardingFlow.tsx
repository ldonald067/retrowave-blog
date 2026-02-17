import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { ChevronUp, Sparkles, Heart, Shield, Lock } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Constants
const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels
const SLIDE_ANIMATION_DISTANCE = 300; // Slide transition distance

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5]);

  const slides = [
    {
      icon: Sparkles,
      title: 'Your Personal Journal',
      subtitle: 'Express yourself freely',
      description:
        'A private space to capture your thoughts, feelings, and memories. Your story, your way.',
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      bgGradient: 'from-violet-50 to-fuchsia-50',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
            className="text-9xl"
          >
            ✨
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-200/40 to-fuchsia-200/40 blur-3xl" />
          </motion.div>
        </div>
      ),
    },
    {
      icon: Heart,
      title: 'Rich Storytelling',
      subtitle: 'Bring your posts to life',
      description:
        'Add music, videos, photos, and mood tags. Create posts that truly capture the moment.',
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      bgGradient: 'from-pink-50 to-rose-50',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-7xl sm:text-8xl"
          >
            💭
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="absolute top-8 sm:top-12 right-12 sm:right-20 text-3xl sm:text-4xl"
            aria-hidden="true"
          >
            🎵
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute bottom-12 sm:bottom-16 left-12 sm:left-16 text-3xl sm:text-4xl"
            aria-hidden="true"
          >
            📸
          </motion.div>
        </div>
      ),
    },
    {
      icon: Lock,
      title: 'Your Privacy, Your Choice',
      subtitle: 'Complete control',
      description:
        'Make posts public or private. Share only what you want, when you want. No surprises.',
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="text-8xl"
          >
            🔒
          </motion.div>
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg width="200" height="200" className="text-blue-400/30">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </motion.div>
        </div>
      ),
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      subtitle: 'Ages 13+',
      description:
        'No ads, no tracking, no data selling. Just a safe space for your thoughts and creativity.',
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-green-50',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="text-8xl"
          >
            🛡️
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-20 text-3xl"
          >
            ✓
          </motion.div>
        </div>
      ),
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD && currentStep < slides.length - 1) {
      handleNext();
    } else if (info.offset.y > SWIPE_THRESHOLD && currentStep > 0) {
      handlePrevious();
    }
  };

  const slide = slides[currentStep];
  const isLastSlide = currentStep === slides.length - 1;

  if (!slide) return null;

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? SLIDE_ANIMATION_DISTANCE : -SLIDE_ANIMATION_DISTANCE,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction > 0 ? -SLIDE_ANIMATION_DISTANCE : SLIDE_ANIMATION_DISTANCE,
      opacity: 0,
    }),
  };

  return (
    <div className={`fixed inset-0 bg-gradient-to-b ${slide.bgGradient} z-50 overflow-hidden`}>
      {/* Status Bar Area (iOS style) */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-transparent" />

      {/* Skip Button - iOS style top right */}
      {!isLastSlide && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onComplete}
          aria-label="Skip onboarding"
          className="absolute top-12 right-4 sm:right-6 text-sm font-semibold text-gray-600 hover:text-gray-900 transition z-10"
        >
          Skip
        </motion.button>
      )}

      {/* Progress Dots - iOS style */}
      <div
        className="absolute top-16 left-0 right-0 flex justify-center gap-2 z-10"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={slides.length}
        aria-label={`Slide ${currentStep + 1} of ${slides.length}`}
      >
        {slides.map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{
              scale: index === currentStep ? 1 : 0.8,
              opacity: index === currentStep ? 1 : 0.4,
            }}
            className={`h-2 rounded-full transition-all ${
              index === currentStep
                ? `w-6 bg-gradient-to-r ${slide.gradient}`
                : index < currentStep
                  ? 'w-2 bg-gray-400'
                  : 'w-2 bg-gray-300'
            }`}
            aria-label={`Slide ${index + 1}${index === currentStep ? ' - current' : ''}`}
          />
        ))}
      </div>

      {/* Main Content - Swipeable */}
      <div className="relative h-full pt-28 pb-32 px-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              y: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ opacity }}
            className="w-full max-w-sm flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
          >
            {/* Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="w-full mb-8"
            >
              {slide.illustration}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-3"
            >
              <span className={`bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent`}>
                {slide.title}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-sm sm:text-base font-medium text-gray-500 text-center mb-4"
            >
              {slide.subtitle}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm sm:text-base text-gray-600 text-center leading-relaxed max-w-sm px-4"
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action Area - iOS style */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 bg-gradient-to-t from-white/50 to-transparent backdrop-blur-sm">
        <div className="max-w-sm mx-auto space-y-4">
          {/* Swipe Hint - Only show on first slide */}
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-col items-center gap-2 text-gray-400 mb-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                aria-hidden="true"
              >
                <ChevronUp size={20} />
              </motion.div>
              <p className="text-xs font-medium">Swipe up to continue</p>
            </motion.div>
          )}

          {/* Next/Get Started Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            aria-label={
              isLastSlide ? 'Get started with the app' : `Continue to slide ${currentStep + 2}`
            }
            className={`w-full py-3 sm:py-4 rounded-2xl font-semibold text-white text-base sm:text-lg shadow-lg bg-gradient-to-r ${slide.gradient} transition-all`}
          >
            {isLastSlide ? 'Get Started' : 'Continue'}
          </motion.button>

          {/* Terms Text */}
          {isLastSlide && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center text-gray-400 px-4"
            >
              By continuing, you agree to our Terms of Service and Privacy Policy
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
