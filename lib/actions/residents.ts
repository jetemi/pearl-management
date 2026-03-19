"use server";

import { createClient } from "@/lib/supabase/server";
import type { ResidentRole } from "@/lib/auth";

export async function updateResidentRole(
  residentId: string,
  role: ResidentRole
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("residents")
    .update({ role })
    .eq("id", residentId);

  if (error) throw error;
  return { success: true };
}
