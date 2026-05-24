import Link from "next/link";
import { knowledgeAreas, getQuestionsByKa } from "@/lib/cbap/content";
import type { KnowledgeAreaId } from "@/lib/cbap/content/types";
import { QuizRunner } from "@/components/cbap/quiz-runner";

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ ka?: string }> }) {
  const { ka } = await searchParams;

  if (ka) {
    const qs = getQuestionsByKa(ka as KnowledgeAreaId).map((q) => ({
      id: q.id, stem: q.stem, options: q.options as unknown as string[], correctIndex: q.correctIndex, explanation: q.explanation,
    }));
    return (
      <div>
        <Link href="/cbap/quiz" className="text-sm hover:underline">← Quiz hub</Link>
        <h1 className="mt-2 text-2xl font-bold">Practice: {ka}</h1>
        <QuizRunner questions={qs} mode="practice" kaId={ka} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Quiz</h1>
      <h2 className="mt-4 font-semibold">Practice by knowledge area</h2>
      <ul className="mt-2 grid gap-2 md:grid-cols-2">
        {knowledgeAreas.map((k) => (
          <li key={k.id}>
            <Link href={`/cbap/quiz?ka=${k.id}`} className="block rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
              {k.name} ({getQuestionsByKa(k.id).length} q)
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Mock exam</h2>
      <Link href="/cbap/quiz/mock" className="mt-2 inline-block rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20">
        Start timed mock (120 Q / 210 min)
      </Link>
    </div>
  );
}
