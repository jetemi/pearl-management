import Link from "next/link";
import { knowledgeAreas, getTasksByKa } from "@/lib/cbap/content";

export default function LearnIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Learn</h1>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {knowledgeAreas.map((ka) => (
          <li key={ka.id} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <Link href={`/cbap/learn/${ka.id}`} className="font-semibold hover:underline">
              {ka.name}
            </Link>
            <p className="mt-1 text-sm opacity-70">{ka.summary}</p>
            <p className="mt-2 text-xs opacity-60">
              {getTasksByKa(ka.id).length} tasks · {Math.round(ka.examWeight * 100)}% of exam
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
