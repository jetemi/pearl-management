import type { Question, KnowledgeAreaId } from "@/lib/cbap/content/types";
import { examBlueprint, MOCK_QUESTION_COUNT } from "@/lib/cbap/blueprint";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sample up to `count` questions weighted by the blueprint. If a KA lacks enough
 * questions, the shortfall is back-filled from the remaining pool so the exam still
 * reaches `count` when the overall bank is large enough.
 */
export function assembleMockExam(all: Question[], count = MOCK_QUESTION_COUNT): Question[] {
  const byKa = new Map<KnowledgeAreaId, Question[]>();
  for (const q of all) byKa.set(q.kaId, [...(byKa.get(q.kaId) ?? []), q]);

  const picked: Question[] = [];
  const used = new Set<string>();

  (Object.keys(examBlueprint) as KnowledgeAreaId[]).forEach((ka) => {
    const want = Math.round(count * examBlueprint[ka]);
    const pool = shuffle(byKa.get(ka) ?? []);
    for (const q of pool.slice(0, want)) {
      picked.push(q);
      used.add(q.id);
    }
  });

  if (picked.length < count) {
    const rest = shuffle(all.filter((q) => !used.has(q.id)));
    for (const q of rest) {
      if (picked.length >= count) break;
      picked.push(q);
      used.add(q.id);
    }
  }
  return shuffle(picked).slice(0, count);
}
