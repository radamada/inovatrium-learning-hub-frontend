/**
 * Centralized time-based magic constants used across the frontend.
 *
 * Mirrors backend/src/common/constants/timings.ts in spirit. Before this,
 * polling/debounce values lived as raw `5_000`/`1_500`/`400` literals
 * scattered across components — easy to bump one and forget peers.
 */

const SECOND_MS = 1000;

/** Polling intervals (ms) for client-side `setInterval`/recursive setTimeout. */
export const POLLING_MS = {
  /**
   * Initial Bunny CDN video processing-status poll. The page backs off after
   * the first few hits — see admin/courses/new where it doubles to 10s, 20s.
   */
  VIDEO_STATUS_INITIAL: 5 * SECOND_MS,
} as const;

/** Debounce delays (ms) for user-input-driven side effects. */
export const DEBOUNCE_MS = {
  /** Search-as-you-type on the public courses listing. */
  SEARCH: 400,
  /** Auto-save lesson notes / draft text. */
  NOTE_SAVE: 1.5 * SECOND_MS,
} as const;

/** Cookie max-age (seconds — Set-Cookie format). Mirror of backend. */
export const COOKIE_MAX_AGE_S = {
  /** Mirrors backend refresh-token TTL — bump both together. */
  USER_ROLE: 7 * 24 * 60 * 60,
} as const;
