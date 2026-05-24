export interface SrsState {
  ease: number;          // >= 1.3, default 2.5
  intervalDays: number;  // days until next review
  repetitions: number;   // consecutive correct (grade >= 3)
  dueDate: string;       // ISO date 'YYYY-MM-DD'
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function defaultSrsState(today = new Date()): SrsState {
  return { ease: 2.5, intervalDays: 0, repetitions: 0, dueDate: isoDate(today) };
}

/**
 * SM-2 update. grade 0..5 (0=blackout, 5=perfect). Grades < 3 reset repetitions.
 */
export function reviewCard(state: SrsState, grade: number, today = new Date()): SrsState {
  const g = Math.max(0, Math.min(5, Math.round(grade)));
  let { ease, intervalDays, repetitions } = state;

  if (g < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
  }

  ease = ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due = new Date(today);
  due.setDate(due.getDate() + intervalDays);
  return { ease: Number(ease.toFixed(2)), intervalDays, repetitions, dueDate: isoDate(due) };
}
