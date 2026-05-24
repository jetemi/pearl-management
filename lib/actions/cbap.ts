"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { reviewCard, defaultSrsState, type SrsState } from "@/lib/cbap/srs";

export async function markItemReviewed(itemId: string, itemType: "task" | "ka") {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cbap_item_progress")
    .upsert(
      { user_id: user.id, item_id: itemId, item_type: itemType, reviewed: true, reviewed_at: new Date().toISOString() },
      { onConflict: "user_id,item_id" }
    );
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/cbap/learn");
  return { success: true as const };
}

export async function upsertFlashcardReview(cardId: string, grade: number) {
  const user = await requireCbapUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cbap_flashcard_state")
    .select("ease, interval_days, repetitions, due_date")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  const prev: SrsState = existing
    ? {
        ease: Number(existing.ease),
        intervalDays: existing.interval_days,
        repetitions: existing.repetitions,
        dueDate: existing.due_date,
      }
    : defaultSrsState();

  const next = reviewCard(prev, grade);

  const { error } = await supabase.from("cbap_flashcard_state").upsert(
    {
      user_id: user.id,
      card_id: cardId,
      ease: next.ease,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      due_date: next.dueDate,
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" }
  );
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, dueDate: next.dueDate };
}
