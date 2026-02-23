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

// ── Field length limits (must match migration 20260223000001) ──────────────
export const POST_LIMITS = {
  title: { min: 1, max: 200 },
  content: { min: 1, max: 50000 },
  author: { max: 50 },
  mood: { max: 100 },
  music: { max: 200 },
} as const;

export interface PostValidationErrors {
  title?: string;
  content?: string;
  author?: string;
  mood?: string;
  music?: string;
  embedded_links?: string;
}

export function validatePostInput(
  input: Partial<CreatePostInput>,
): PostValidationErrors {
  const errors: PostValidationErrors = {};

  const title = (input.title ?? '').trim();
  if (title.length < POST_LIMITS.title.min) {
    errors.title = 'Title is required';
  } else if (title.length > POST_LIMITS.title.max) {
    errors.title = `Title must be ${POST_LIMITS.title.max} characters or fewer`;
  }

  const content = (input.content ?? '').trim();
  if (content.length < POST_LIMITS.content.min) {
    errors.content = 'Post content is required';
  } else if (content.length > POST_LIMITS.content.max) {
    errors.content = `Content must be ${POST_LIMITS.content.max.toLocaleString()} characters or fewer`;
  }

  const author = input.author ?? '';
  if (author.length > POST_LIMITS.author.max) {
    errors.author = `Author name must be ${POST_LIMITS.author.max} characters or fewer`;
  }

  const mood = input.mood ?? '';
  if (mood.length > POST_LIMITS.mood.max) {
    errors.mood = `Mood must be ${POST_LIMITS.mood.max} characters or fewer`;
  }

  const music = input.music ?? '';
  if (music.length > POST_LIMITS.music.max) {
    errors.music = `Music field must be ${POST_LIMITS.music.max} characters or fewer`;
  }

  return errors;
}

export function validateEmbeddedLinks(
  value: Json | null | undefined,
): string | null {
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
  }
  return null;
}

export function hasValidationErrors(
  errors: PostValidationErrors | ProfileValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}

// ── Profile field limits ────────────────────────────────────────────────────
// F3 FIX: No DB CHECK constraints exist yet for profiles, but these prevent
// absurdly long values from hitting the database. If DB constraints are added
// later (via a new migration), keep these in sync.
export const PROFILE_LIMITS = {
  display_name: { max: 50 },
  bio: { max: 500 },
  current_mood: { max: 100 },
  current_music: { max: 200 },
  username: { max: 50 },
} as const;

export interface ProfileValidationErrors {
  display_name?: string;
  bio?: string;
  current_mood?: string;
  current_music?: string;
  username?: string;
}

/**
 * Validate profile update fields. Only checks fields that are present
 * in the input (partial updates are valid).
 */
export function validateProfileInput(
  input: Record<string, unknown>,
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if ('display_name' in input && typeof input.display_name === 'string') {
    if (input.display_name.length > PROFILE_LIMITS.display_name.max) {
      errors.display_name = `Display name must be ${PROFILE_LIMITS.display_name.max} characters or fewer`;
    }
  }

  if ('bio' in input && typeof input.bio === 'string') {
    if (input.bio.length > PROFILE_LIMITS.bio.max) {
      errors.bio = `Bio must be ${PROFILE_LIMITS.bio.max} characters or fewer`;
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

  if ('username' in input && typeof input.username === 'string') {
    if (input.username.length > PROFILE_LIMITS.username.max) {
      errors.username = `Username must be ${PROFILE_LIMITS.username.max} characters or fewer`;
    }
  }

  return errors;
}
