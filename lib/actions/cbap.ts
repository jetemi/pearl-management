"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";

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
