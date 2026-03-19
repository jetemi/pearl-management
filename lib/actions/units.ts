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

export async function addResidentToUnit(unitId: string, email: string) {
  const supabase = await createClient();

  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new Error("Email is required");

  const { data: userId } = await supabase.rpc("get_auth_user_id_by_email", {
    user_email: trimmedEmail,
  });

  if (!userId) {
    throw new Error(
      "No account found with this email. They must sign up at /login first, then you can link them."
    );
  }

  const { error } = await supabase.from("residents").insert({
    id: userId,
    unit_id: unitId,
    role: "resident",
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "This person is already linked to a unit. Ask chairman to reassign."
      );
    }
    throw error;
  }
  return { success: true };
}

export async function importUnitsFromCSV(
  rows: { flat_number: string; owner_name: string; phone: string | null; email: string | null }[]
) {
  const supabase = await createClient();
  const results: { flat: string; success: boolean; error?: string }[] = [];

  for (const row of rows) {
    const flat = row.flat_number?.trim() ?? "";
    const owner = row.owner_name?.trim() ?? "";
    if (!flat || !owner) {
      results.push({ flat: flat || "(empty)", success: false, error: "Missing flat or owner" });
      continue;
    }

    const { error } = await supabase.from("units").insert({
      flat_number: flat,
      owner_name: owner,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
    });

    if (error) {
      results.push({
        flat,
        success: false,
        error: error.code === "23505" ? "Duplicate flat number" : error.message,
      });
    } else {
      results.push({ flat, success: true });
    }
  }

  return results;
}
