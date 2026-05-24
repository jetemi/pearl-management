import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { flashcards } from "@/lib/cbap/content";
import { isoDate } from "@/lib/cbap/srs";
import { FlashcardSession } from "@/components/cbap/flashcard-session";

export default async function FlashcardsPage() {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const today = isoDate(new Date());

  const { data: states } = await supabase
    .from("cbap_flashcard_state")
    .select("card_id, due_date")
    .eq("user_id", user.id);

  const stateByCard = new Map((states ?? []).map((s) => [s.card_id, s.due_date as string]));
  // Due = never seen OR due_date <= today.
  const due = flashcards.filter((c) => {
    const d = stateByCard.get(c.id);
    return d === undefined || d <= today;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <p className="mt-1 text-sm opacity-70">{due.length} card(s) due today</p>
      <FlashcardSession cards={due.map((c) => ({ id: c.id, front: c.front, back: c.back }))} />
    </div>
  );
}
