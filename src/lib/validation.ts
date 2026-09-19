/**
 * Client-side validation mirroring DB CHECK constraints.
 * These give immediate UI feedback without a round-trip.
 *
 * The DB constraints (migration 20260223000001_post_constraints.sql) are
 * the authoritative source of truth. Keep limits in sync.
 *
 * USAGE:
 *   import { validatePostInput, hasValidationErrors } from '../lib/validation';
 *   const errors = validatePostInput({ title, content });
 *   if (hasValidationErrors(errors)) { // show errors }
 */

import type { CreatePostInput } from '../types/post';
import type { Json } from '../types/database';
import { quickContentCheck } from './moderation';

// ── Field length limits (must match migration 20260223000001) ──────────────
export const POST_LIMITS = {
  title: { min: 1, max: 200 },
  content: { min: 1, max: 50000 },
  author: { max: 50 },
  chapter: { max: 100 },
  mood: { max: 100 },
  music: { max: 200 },
} as const;

interface PostValidationErrors {
  title?: string;
  content?: string;
  author?: string;
  chapter?: string;
  mood?: string;
  music?: string;
  embedded_links?: string;
}

export function validatePostInput(input: Partial<CreatePostInput>): PostValidationErrors {
  const errors: PostValidationErrors = {};

  // Only validate fields present in the input — defaulting missing fields
  // to '' would fail min-length checks, rejecting a partial update that
  // changes only `mood` with "Title is required." Same 'field' in input
  // pattern as validateProfileInput.

  if ('title' in input) {
    const title = (input.title ?? '').trim();
    if (title.length < POST_LIMITS.title.min) {
      errors.title = 'Title is required';
    } else if (title.length > POST_LIMITS.title.max) {
      errors.title = `Title must be ${POST_LIMITS.title.max} characters or fewer`;
    }
  }

  if ('content' in input) {
    const content = (input.content ?? '').trim();
    if (content.length < POST_LIMITS.content.min) {
      errors.content = 'Post content is required';
    } else if (content.length > POST_LIMITS.content.max) {
      errors.content = `Content must be ${POST_LIMITS.content.max.toLocaleString()} characters or fewer`;
    }
  }

  if ('author' in input) {
    const author = input.author ?? '';
    if (author.length > POST_LIMITS.author.max) {
      errors.author = `Author name must be ${POST_LIMITS.author.max} characters or fewer`;
    }
  }

  if ('chapter' in input) {
    const chapter = input.chapter ?? '';
    if (chapter.length > POST_LIMITS.chapter.max) {
      errors.chapter = `Chapter name must be ${POST_LIMITS.chapter.max} characters or fewer`;
    } else if (chapter.length > 0) {
      const mod = quickContentCheck(chapter);
      if (!mod.allowed) {
        errors.chapter = 'Chapter name contains inappropriate content';
      }
    }
  }

  if ('mood' in input) {
    const mood = input.mood ?? '';
    if (mood.length > POST_LIMITS.mood.max) {
      errors.mood = `Mood must be ${POST_LIMITS.mood.max} characters or fewer`;
    }
  }

  if ('music' in input) {
    const music = input.music ?? '';
    if (music.length > POST_LIMITS.music.max) {
      errors.music = `Music field must be ${POST_LIMITS.music.max} characters or fewer`;
    }
  }

  return errors;
}

export function validateEmbeddedLinks(value: Json | null | undefined): string | null {
  if (value == null) return null;
  if (!Array.isArray(value)) {
    return 'embedded_links must be an array of link objects';
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return `embedded_links[${i}] must be a link preview object`;
    }
    const link = item as Record<string, unknown>;
    if (typeof link.url !== 'string' || !link.url) {
      return `embedded_links[${i}].url is required and must be a string`;
    }
    // Reject non-http(s) schemes to prevent stored XSS via
    // javascript: or data: URLs rendered as href attributes.
    if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
      return `embedded_links[${i}].url must use http or https`;
    }
  }
  return null;
}

export function hasValidationErrors(
  errors: PostValidationErrors | ProfileValidationErrors
): boolean {
  return Object.keys(errors).length > 0;
}

// ── Profile field limits (must match migration 20260224000004 + 20260224000008) ──
export const PROFILE_LIMITS = {
  display_name: { max: 50 },
  bio: { max: 500 },
  current_mood: { max: 100 },
  current_music: { max: 200 },
  status_message: { max: 100 },
  username: { min: 1, max: 50 },
} as const;

/**
 * Usernames are chosen by the person (since 2026-09-19) and public: they are the
 * @handle on a public page and the /u/<name> link. Before that they were copied
 * from the email address, which put half of it on every public page.
 *
 * Lowercase only, enforced in prod by profiles_username_format, so `Glitter`
 * and `glitter` can never be two different people — lookups and uniqueness are
 * exact-match. 3–30 for a chosen name; the database still allows 1–50 because
 * names generated before this (and the sign-up fallback) can run longer.
 */
export const USERNAME_LIMITS = { min: 3, max: 30 } as const;
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Names that would let someone pass as the operator — on a public page and in
 * the report emails the operator reads. Mirrored exactly by
 * public.is_reserved_username() (migration 20260919010000); change both.
 * Anything containing "retrowave" is reserved as well.
 */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'help',
  'helpdesk',
  'contact',
  'hello',
  'info',
  'abuse',
  'security',
  'moderator',
  'moderators',
  'mod',
  'mods',
  'staff',
  'team',
  'official',
  'owner',
  'appreview',
  'app-review',
  'app_review',
  'apple',
  'anonymous',
  'deleted',
  'user',
  'null',
  'undefined',
] as const;

export function isReservedUsername(username: string): boolean {
  const name = username.toLowerCase();
  return (RESERVED_USERNAMES as readonly string[]).includes(name) || name.includes('retrowave');
}

/** The generated name when none was chosen — the same shape handle_new_user uses. */
export function fallbackUsername(userId: string): string {
  return `user_${userId.slice(0, 8)}`;
}

/**
 * When sign-up could not give someone the name they asked for — it was taken
 * between the check and sign-up, or the check itself failed — handle_new_user
 * stores a suffixed or generated name instead. Returns the notice to show, or
 * null when they got what they asked for.
 */
export function usernameSwapNotice(
  requested: unknown,
  actual: string | null | undefined
): string | null {
  if (typeof requested !== 'string' || !actual) return null;
  const wanted = normalizeUsername(requested);
  if (!wanted || wanted === actual) return null;
  return `~ @${wanted} wasn't available when ur account was made, so u got @${actual}. pick a new one below if u want ~`;
}

/** Trims, drops a leading @, and lowercases — what people type into what is stored. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Problems with a (normalized) username, or null. Inline form copy, so it is in
 * the app's voice.
 */
export function validateUsername(username: string): string | null {
  if (!username) return 'pick a username';
  if (username.length < USERNAME_LIMITS.min) {
    return `at least ${USERNAME_LIMITS.min} characters`;
  }
  if (username.length > USERNAME_LIMITS.max) {
    return `${USERNAME_LIMITS.max} characters max`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'only lowercase letters, numbers, _ and -';
  }
  if (isReservedUsername(username)) return "that one's reserved, pick another";
  if (!quickContentCheck(username).allowed) return 'pick a different username';
  return null;
}

// Password minimum length (must match supabase config.toml minimum_password_length)
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Mirrors the password policy Supabase enforces server-side: lower + upper +
 * digit + symbol, at least PASSWORD_MIN_LENGTH.
 *
 * Shared rather than inline because signup and password-reset must agree. If
 * they drift, one of them lets a password through that the server then refuses,
 * and the rejection arrives from the API with no field to attach it to.
 *
 * Returns null when the password is acceptable.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `at least ${PASSWORD_MIN_LENGTH} characters plz`;
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    return 'needs UPPER & lower letters, a number & a symbol';
  }
  return null;
}

interface ProfileValidationErrors {
  display_name?: string;
  bio?: string;
  current_mood?: string;
  current_music?: string;
  status_message?: string;
  username?: string;
}

/**
 * Validate profile update fields. Only checks fields that are present
 * in the input (partial updates are valid).
 */
export function validateProfileInput(input: Record<string, unknown>): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if ('display_name' in input && typeof input.display_name === 'string') {
    if (input.display_name.length > PROFILE_LIMITS.display_name.max) {
      errors.display_name = `Display name must be ${PROFILE_LIMITS.display_name.max} characters or fewer`;
    } else if (input.display_name.length > 0) {
      const mod = quickContentCheck(input.display_name);
      if (!mod.allowed) {
        errors.display_name = 'Display name contains inappropriate content';
      }
    }
  }

  if ('bio' in input && typeof input.bio === 'string') {
    if (input.bio.length > PROFILE_LIMITS.bio.max) {
      errors.bio = `Bio must be ${PROFILE_LIMITS.bio.max} characters or fewer`;
    } else if (input.bio.length > 0) {
      const mod = quickContentCheck(input.bio);
      if (!mod.allowed) {
        errors.bio = 'Bio contains inappropriate content';
      }
    }
  }

  if ('current_mood' in input && typeof input.current_mood === 'string') {
    if (input.current_mood.length > PROFILE_LIMITS.current_mood.max) {
      errors.current_mood = `Mood must be ${PROFILE_LIMITS.current_mood.max} characters or fewer`;
    }
  }

  if ('current_music' in input && typeof input.current_music === 'string') {
    if (input.current_music.length > PROFILE_LIMITS.current_music.max) {
      errors.current_music = `Music field must be ${PROFILE_LIMITS.current_music.max} characters or fewer`;
    }
  }

  if ('status_message' in input && typeof input.status_message === 'string') {
    if (input.status_message.length > PROFILE_LIMITS.status_message.max) {
      errors.status_message = `Status message must be ${PROFILE_LIMITS.status_message.max} characters or fewer`;
    } else if (input.status_message.length > 0) {
      const mod = quickContentCheck(input.status_message);
      if (!mod.allowed) {
        errors.status_message = 'Status message contains inappropriate content';
      }
    }
  }

  if ('username' in input && typeof input.username === 'string') {
    const problem = validateUsername(input.username);
    if (problem) errors.username = problem;
  }

  return errors;
}
