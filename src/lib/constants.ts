/**
 * Application Constants
 * Centralized configuration for the app
 */

// Age Verification
export const MIN_AGE = 13; // COPPA compliance
export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE = 100;

// Validation Rules
export const VALIDATION = {
  displayName: {
    maxLength: 50,
    minLength: 1,
  },
  bio: {
    maxLength: 500,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  auth: {
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email address',
    ageVerificationRequired: 'Please select your birth year',
    tosRequired: 'You must accept the Terms of Service to continue',
    underage: `You must be at least ${MIN_AGE} years old to use this service`,
  },
  profile: {
    displayNameTooLong: `Display name must be ${VALIDATION.displayName.maxLength} characters or less`,
    bioTooLong: `Bio must be ${VALIDATION.bio.maxLength} characters or less`,
  },
  generic: {
    somethingWrong: 'Something went wrong. Please try again.',
    networkError: 'Network error. Please check your connection.',
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  auth: {
    magicLinkSent: 'Check your email for the magic link!',
    signedOut: 'You have been signed out successfully',
  },
  profile: {
    updated: 'Profile updated successfully',
  },
  post: {
    created: 'Post created successfully',
    updated: 'Post updated successfully',
    deleted: 'Post deleted successfully',
  },
} as const;

// UI Constants
export const UI = {
  toast: {
    duration: 3000, // milliseconds
  },
  animation: {
    swipeThreshold: 50, // pixels
    slideDistance: 300, // pixels
  },
} as const;

// Routes (if needed later)
export const ROUTES = {
  home: '/',
  profile: '/profile',
  post: '/post',
} as const;

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

export type Mood = (typeof MOODS)[number];
