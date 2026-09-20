import type { Question } from "@/lib/cbap/content/types";
import { isoDate } from "@/lib/cbap/srs";

export const DEFAULT_DAILY_TARGET = 15;

/** Per-question spaced-repetition state, mirroring cbap_question_state. */
export interface QuestionState {
  questionId: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  timesSeen: number;
  timesCorrect: number;
}

/** Deterministic PRNG so a given (user, day) always yields the same set. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DailySetOptions {
  all: Question[];
  states: QuestionState[];
  today?: string;
  target?: number;
  /** Stable per-user-per-day seed, e.g. `${userId}:${today}`. */
  seed: string;
  /** Questions already answered today — kept out so a session can resume. */
  excludeIds?: string[];
}

export interface DailySet {
  questions: Question[];
  /** How many of `questions` are repeats coming back on the SM-2 schedule. */
  reviewCount: number;
  /** How many are being seen for the first time. */
  newCount: number;
  /** Due reviews that did not fit inside today's target. */
  backlog: number;
}

/**
 * Build today's review set.
 *
 * Due reviews come first in priority (most overdue, then hardest by ease), but
 * they are capped so that new material keeps flowing while unseen questions
 * remain — otherwise a backlog would permanently starve out new coverage.
 *
 * The returned order is shuffled rather than grouped by knowledge area: the real
 * exam interleaves KAs, and mixed practice retains better than blocked practice.
 */
export function buildDailySet({
  all,
  states,
  today = isoDate(new Date()),
  target = DEFAULT_DAILY_TARGET,
  seed,
  excludeIds = [],
}: DailySetOptions): DailySet {
  const done = new Set(excludeIds);
  const byId = new Map(all.map((q) => [q.id, q]));
  const stateById = new Map(states.map((s) => [s.questionId, s]));

  const remaining = Math.max(0, target - done.size);
  if (remaining === 0) return { questions: [], reviewCount: 0, newCount: 0, backlog: 0 };

  // Due reviews: most overdue first, then lowest ease (hardest), then worst accuracy.
  const due = states
    .filter((s) => s.dueDate <= today && byId.has(s.questionId) && !done.has(s.questionId))
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (a.ease !== b.ease) return a.ease - b.ease;
      const accA = a.timesSeen ? a.timesCorrect / a.timesSeen : 0;
      const accB = b.timesSeen ? b.timesCorrect / b.timesSeen : 0;
      return accA - accB;
    });

  const unseen = all.filter((q) => !stateById.has(q.id) && !done.has(q.id));

  // Reserve part of the day for new questions while any remain unseen.
  const newReserve = unseen.length > 0 ? Math.min(Math.ceil(target / 3), unseen.length) : 0;
  const reviewSlots = Math.max(0, remaining - newReserve);

  const reviews = due.slice(0, reviewSlots).map((s) => byId.get(s.questionId)!);
  const news = seededShuffle(unseen, seed).slice(0, remaining - reviews.length);

  // If reviews ran short, top back up from the due pool before giving up slots.
  const extra = due
    .slice(reviewSlots)
    .slice(0, Math.max(0, remaining - reviews.length - news.length))
    .map((s) => byId.get(s.questionId)!);

  const picked = [...reviews, ...extra, ...news];

  return {
    questions: seededShuffle(picked, seed + ":order"),
    reviewCount: reviews.length + extra.length,
    newCount: news.length,
    backlog: Math.max(0, due.length - reviews.length - extra.length),
  };
}

/**
 * Consecutive days with at least one answered question, counting back from today.
 * A day still in progress counts; the streak only breaks once a day is skipped
 * entirely, so today's incomplete session never reads as a broken streak.
 *
 * All arithmetic is done in UTC to match `isoDate`, which formats via toISOString().
 * Parsing "YYYY-MM-DD" as local time and formatting back as UTC shifts the date by a
 * day for any user east of Greenwich, which would silently break every streak.
 */
export function computeStreak(reviewDates: string[], today = isoDate(new Date())): number {
  const days = new Set(reviewDates);
  let streak = 0;
  const cursor = new Date(today + "T00:00:00Z");

  // Today not yet started shouldn't zero out a streak earned through yesterday.
  if (!days.has(isoDate(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (days.has(isoDate(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** SM-2 grade for a question answer. Below 3 resets the repetition count. */
export function gradeForAnswer(correct: boolean): number {
  return correct ? 4 : 2;
}
