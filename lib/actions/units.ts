"use server";

import { createClient } from "@/lib/supabase/server";

export async function addUnit(data: {
  flat_number: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
}) {
  const supabase = await createClient();

  const { data: newUnit, error: unitError } = await supabase
    .from("units")
    .insert({
      flat_number: data.flat_number.trim(),
      owner_name: data.owner_name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
    })
    .select("id")
    .single();

  if (unitError) throw unitError;
  if (!newUnit) throw new Error("Failed to create unit");

  if (data.email?.trim()) {
    const { data: userId } = await supabase.rpc("get_auth_user_id_by_email", {
      user_email: data.email.trim(),
    });

    if (userId) {
      await supabase
        .from("residents")
        .upsert(
          { id: userId, unit_id: newUnit.id, role: "resident" },
          { onConflict: "id" }
        );
    }
  }

  return { id: newUnit.id };
}
