import Link from "next/link";
import { questions } from "@/lib/cbap/content";
import { assembleMockExam } from "@/lib/cbap/exam";
import { MOCK_DURATION_MIN } from "@/lib/cbap/blueprint";
import { QuizRunner } from "@/components/cbap/quiz-runner";

export const dynamic = "force-dynamic"; // re-sample each visit

export default function MockExamPage() {
  const exam = assembleMockExam(questions).map((q) => ({
    id: q.id, stem: q.stem, options: q.options as unknown as string[], correctIndex: q.correctIndex, explanation: q.explanation,
  }));

  return (
    <div>
      <Link href="/cbap/quiz" className="text-sm hover:underline">← Quiz hub</Link>
      <h1 className="mt-2 text-2xl font-bold">Mock Exam</h1>
      <p className="mt-1 text-sm opacity-70">{exam.length} questions · {MOCK_DURATION_MIN} minutes · no feedback until the end</p>
      <QuizRunner questions={exam} mode="mock" kaId={null} timeLimitSec={MOCK_DURATION_MIN * 60} />
    </div>
  );
}
