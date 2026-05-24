"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertFlashcardReview } from "@/lib/actions/cbap";

type Card = { id: string; front: string; back: string };

export function FlashcardSession({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, start] = useTransition();

  if (cards.length === 0) return <p className="mt-6 text-sm">Nothing due — great work. Come back tomorrow.</p>;
  if (i >= cards.length) return <p className="mt-6 text-sm font-medium">Session complete ✓ ({cards.length} reviewed)</p>;

  const card = cards[i];
  const grade = (g: number) =>
    start(async () => {
      const res = await upsertFlashcardReview(card.id, g);
      if (!res.success) { toast.error(res.error); return; }
      setFlipped(false);
      setI((n) => n + 1);
    });

  return (
    <div className="mt-6 max-w-xl">
      <div className="rounded-xl border border-black/15 p-6 dark:border-white/20">
        <p className="text-xs opacity-60">Card {i + 1} / {cards.length}</p>
        <p className="mt-3 text-lg font-medium">{card.front}</p>
        {flipped && <p className="mt-4 border-t border-black/10 pt-4 text-base dark:border-white/15">{card.back}</p>}
      </div>
      {!flipped ? (
        <button onClick={() => setFlipped(true)} className="mt-4 rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20">
          Show answer
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { g: 1, label: "Again" },
            { g: 3, label: "Hard" },
            { g: 4, label: "Good" },
            { g: 5, label: "Easy" },
          ].map(({ g, label }) => (
            <button key={g} disabled={pending} onClick={() => grade(g)}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
