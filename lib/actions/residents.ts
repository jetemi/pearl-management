"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import type { ResidentRole } from "@/lib/auth-roles";

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

export async function updateResidentPhone(
  residentId: string,
  phone: string | null
) {
  const me = await getCurrentResident();
  if (me?.role !== "chairman") {
    throw new Error("Only the chairman can update phone numbers");
  }

  const supabase = await createClient();
  const trimmed = phone?.trim() || null;
  const { error } = await supabase
    .from("residents")
    .update({ phone: trimmed })
    .eq("id", residentId);

  if (error) throw error;
  return { success: true };
}
