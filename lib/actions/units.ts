"use server";

import { createClient } from "@/lib/supabase/server";

/** Obligation window for new units: service charge from today; diesel from current open cycle if any. */
async function getNewUnitObligationDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: open } = await supabase
    .from("diesel_cycles")
    .select("cycle_number")
    .is("closed_at", null)
    .maybeSingle();
  return {
    service_charge_obligation_start: today,
    diesel_obligation_from_cycle_number: open?.cycle_number ?? null,
  };
}

export async function addUnit(data: {
  flat_number: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  diesel_participates?: boolean;
}) {
  const supabase = await createClient();
  const defaults = await getNewUnitObligationDefaults(supabase);

  const { data: newUnit, error: unitError } = await supabase
    .from("units")
    .insert({
      flat_number: data.flat_number.trim(),
      owner_name: data.owner_name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      diesel_participates: data.diesel_participates ?? true,
      ...defaults,
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

export async function updateUnit(
  id: string,
  data: Partial<{
    flat_number: string;
    owner_name: string;
    phone: string | null;
    email: string | null;
    diesel_participates: boolean;
    service_charge_obligation_start: string | null;
    diesel_obligation_from_cycle_number: number | null;
  }>
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("units")
    .select("diesel_participates")
    .eq("id", id)
    .single();

  const payload: Record<string, unknown> = { ...data };

  if (
    data.diesel_participates === true &&
    existing &&
    existing.diesel_participates === false
  ) {
    const { data: open } = await supabase
      .from("diesel_cycles")
      .select("cycle_number")
      .is("closed_at", null)
      .maybeSingle();
    if (open) {
      payload.diesel_obligation_from_cycle_number = open.cycle_number;
    }
  }

  const { error } = await supabase.from("units").update(payload).eq("id", id);
  if (error) throw error;
}

export async function importUnitsFromCSV(
  rows: { flat_number: string; owner_name: string; phone: string | null; email: string | null }[]
) {
  const supabase = await createClient();
  const defaults = await getNewUnitObligationDefaults(supabase);
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
      ...defaults,
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
