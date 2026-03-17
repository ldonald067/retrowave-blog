/**
 * Application Constants
 * Centralized configuration for the app
 */

// Modal — swipe-to-dismiss pixel threshold (shared by PostModal, ProfileModal, Toast)
export const SWIPE_DISMISS_THRESHOLD = 80;

// Contact — used for report links and privacy page
export const BLOG_OWNER_EMAIL = 'retrowave.blog.app@gmail.com';

// Age Verification
export const MIN_AGE = 13; // COPPA compliance
export const CURRENT_YEAR = new Date().getFullYear();
// MIN_BIRTH_YEAR and MAX_AGE removed — unused by any consumer

// Validation Rules — derived from PROFILE_LIMITS in validation.ts (single source of truth)
import { PROFILE_LIMITS } from './validation';

export const VALIDATION = {
  displayName: {
    maxLength: PROFILE_LIMITS.display_name.max,
    minLength: 1,
  },
  bio: {
    maxLength: PROFILE_LIMITS.bio.max,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

// Error Messages — Xanga voice! not corporate speak
export const ERROR_MESSAGES = {
  auth: {
    emailRequired: '~ pls enter ur email ~',
    emailInvalid: '~ hmm that email doesnt look right :( ~',
    ageVerificationRequired: '~ pls select ur birth year ~',
    tosRequired: '~ u gotta accept the TOS 2 continue ~',
    underage: `~ sorry, u gotta b at least ${MIN_AGE} 2 use this :( ~`,
  },
  profile: {
    displayNameTooLong: `~ ur display name is 2 long! ${VALIDATION.displayName.maxLength} chars max ~`,
    bioTooLong: `~ ur bio is 2 long! ${VALIDATION.bio.maxLength} chars max ~`,
  },
  generic: {
    somethingWrong: '~ uh oh! something glitched :( try again? ~',
    networkError: '💔 ur connection is acting weird... try again soon?',
  },
} as const;

// Success Messages — keep it fun & personal
export const SUCCESS_MESSAGES = {
  auth: {
    magicLinkSent: '✨ check ur email!! theres a magic link waiting 4 u ✨',
    signedOut: '~ goodbye 👋 come back soon! ~',
  },
  profile: {
    updated: '✨ ur profile is looking gr8! ✨',
  },
  post: {
    created: '✨ ur entry is live!! 💕',
    updated: '~ entry updated! looking good ✨ ~',
    deleted: '~ entry deleted 💨 ~',
  },
  block: {
    blocked: '~ blocked that user ~',
    unblocked: '~ unblocked that user ~',
  },
} as const;

// Feed — content truncation thresholds
export const FEED_EXCERPT_MAX = 300; // characters before "read more" appears

// UI.toast.duration removed — useToast.ts owns DEFAULT_DURATIONS (per-type)

// Mood options for posts - Xanga/LiveJournal style!
export const MOODS = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😁', label: 'grinning' },
  { emoji: '😄', label: 'joyful' },
  { emoji: '😆', label: 'excited' },
  { emoji: '🥰', label: 'in love' },
  { emoji: '😍', label: 'loved' },
  { emoji: '🤗', label: 'grateful' },
  { emoji: '😌', label: 'peaceful' },
  { emoji: '😇', label: 'blessed' },
  { emoji: '🥳', label: 'partying' },
  { emoji: '🤩', label: 'starstruck' },
  { emoji: '😋', label: 'yummy' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🙃', label: 'silly' },
  { emoji: '😏', label: 'smirking' },
  { emoji: '🤪', label: 'crazy' },
  { emoji: '😜', label: 'playful' },
  { emoji: '🤓', label: 'nerdy' },
  { emoji: '🥸', label: 'disguised' },
  { emoji: '😴', label: 'sleepy' },
  { emoji: '🥱', label: 'tired' },
  { emoji: '😪', label: 'exhausted' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😭', label: 'crying' },
  { emoji: '😔', label: 'disappointed' },
  { emoji: '😞', label: 'down' },
  { emoji: '😟', label: 'worried' },
  { emoji: '🥺', label: 'lonely' },
  { emoji: '😩', label: 'frustrated' },
  { emoji: '😫', label: 'tired of this' },
  { emoji: '💔', label: 'heartbroken' },
  { emoji: '😤', label: 'annoyed' },
  { emoji: '😠', label: 'angry' },
  { emoji: '😡', label: 'furious' },
  { emoji: '🤬', label: 'cursing' },
  { emoji: '😰', label: 'anxious' },
  { emoji: '😱', label: 'shocked' },
  { emoji: '😨', label: 'scared' },
  { emoji: '😬', label: 'awkward' },
  { emoji: '🫣', label: 'embarrassed' },
  { emoji: '😳', label: 'flustered' },
  { emoji: '🤒', label: 'sick' },
  { emoji: '🤕', label: 'hurt' },
  { emoji: '🤧', label: 'sneezing' },
  { emoji: '🤢', label: 'nauseous' },
  { emoji: '🥴', label: 'dizzy' },
  { emoji: '🤔', label: 'thoughtful' },
  { emoji: '🤨', label: 'skeptical' },
  { emoji: '😕', label: 'confused' },
  { emoji: '😐', label: 'meh' },
  { emoji: '😑', label: 'expressionless' },
  { emoji: '🙄', label: 'eye rolling' },
  { emoji: '🤐', label: 'quiet' },
  { emoji: '😶', label: 'speechless' },
  { emoji: '🫥', label: 'invisible' },
  { emoji: '😮‍💨', label: 'relieved' },
  { emoji: '🥹', label: 'touched' },
  { emoji: '✨', label: 'magical' },
  { emoji: '💫', label: 'dreamy' },
  { emoji: '⭐', label: 'stellar' },
  { emoji: '🌈', label: 'rainbow mood' },
  { emoji: '🎭', label: 'dramatic' },
  { emoji: '👻', label: 'spooky' },
  { emoji: '🤖', label: 'robotic' },
  { emoji: '👽', label: 'alien' },
] as const;

// Pre-computed Select options from MOODS — used by PostModal + ProfileModal
export const MOOD_SELECT_OPTIONS = MOODS.map((m) => ({
  value: `${m.emoji} ${m.label}`,
  label: `${m.emoji} ${m.label}`,
}));
