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

export function hasValidationErrors(errors: PostValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
