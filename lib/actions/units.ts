"use server";

import { getCurrentResident } from "@/lib/auth";
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
      const me = await getCurrentResident();
      if (me?.role !== "chairman") {
        throw new Error(
          "This person is already linked (including the default Unit0). Only the chairman can move them to another unit."
        );
      }
      const { error: updateError } = await supabase
        .from("residents")
        .update({ unit_id: unitId })
        .eq("id", userId);
      if (updateError) throw updateError;
      return { success: true };
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
    service_charge_obligation_end: string | null;
    diesel_obligation_from_cycle_number: number | null;
    diesel_obligation_to_cycle_number: number | null;
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
    // Re-joining the generator: bill from the current open cycle forward,
    // and clear any previous "left after cycle N" marker.
    const { data: open } = await supabase
      .from("diesel_cycles")
      .select("cycle_number")
      .is("closed_at", null)
      .maybeSingle();
    if (open) {
      payload.diesel_obligation_from_cycle_number = open.cycle_number;
    }
    if (!("diesel_obligation_to_cycle_number" in data)) {
      payload.diesel_obligation_to_cycle_number = null;
    }
  }

  if (
    data.diesel_participates === false &&
    existing &&
    existing.diesel_participates !== false &&
    !("diesel_obligation_to_cycle_number" in data)
  ) {
    // Leaving the generator without an explicit last-cycle: default to the
    // current open cycle so the unit is billed for the fuel already being burned.
    const { data: open } = await supabase
      .from("diesel_cycles")
      .select("cycle_number")
      .is("closed_at", null)
      .maybeSingle();
    payload.diesel_obligation_to_cycle_number = open?.cycle_number ?? null;
  }

  const { error } = await supabase.from("units").update(payload).eq("id", id);
  if (error) throw error;
}

/**
 * Gracefully end a unit's generator participation. Past contributions stay
 * attached to the cycles they covered; only future cycles stop being billed.
 * Default last cycle = current open cycle number (they are still responsible
 * for the cycle whose fuel is being burned right now).
 */
export async function leaveGenerator(
  unitId: string,
  options: { lastCycleNumber?: number | null } = {}
) {
  const supabase = await createClient();
  let last = options.lastCycleNumber ?? null;
  if (last == null) {
    const { data: open } = await supabase
      .from("diesel_cycles")
      .select("cycle_number")
      .is("closed_at", null)
      .maybeSingle();
    last = open?.cycle_number ?? null;
  }

  const { error } = await supabase
    .from("units")
    .update({
      diesel_participates: false,
      diesel_obligation_to_cycle_number: last,
    })
    .eq("id", unitId);
  if (error) throw error;
  return { lastCycleNumber: last };
}

/**
 * Deactivate a unit (resident leaves the estate). Historical contributions and
 * obligations stay on the books so totals remain accurate. Obligation windows
 * are closed at the provided cut-off defaults.
 */
export async function deactivateUnit(
  unitId: string,
  options: {
    dieselLastCycle?: number | null;
    serviceChargeEndDate?: string | null;
  } = {}
) {
  const supabase = await createClient();

  let dieselLast = options.dieselLastCycle ?? null;
  if (dieselLast == null) {
    const { data: open } = await supabase
      .from("diesel_cycles")
      .select("cycle_number")
      .is("closed_at", null)
      .maybeSingle();
    dieselLast = open?.cycle_number ?? null;
  }

  const scEnd =
    options.serviceChargeEndDate ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("units")
    .update({
      is_active: false,
      diesel_obligation_to_cycle_number: dieselLast,
      service_charge_obligation_end: scEnd,
    })
    .eq("id", unitId);
  if (error) throw error;
  return { dieselLastCycle: dieselLast, serviceChargeEndDate: scEnd };
}

/**
 * Reactivate a unit (moved back in or re-joined generator). Clears obligation
 * end-windows; resumes billing from the current open diesel cycle and today's
 * date for service charge (same semantics as creating a new unit).
 */
export async function reactivateUnit(unitId: string) {
  const supabase = await createClient();
  const { data: open } = await supabase
    .from("diesel_cycles")
    .select("cycle_number")
    .is("closed_at", null)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("units")
    .update({
      is_active: true,
      diesel_participates: true,
      diesel_obligation_to_cycle_number: null,
      service_charge_obligation_end: null,
      diesel_obligation_from_cycle_number: open?.cycle_number ?? null,
      service_charge_obligation_start: today,
    })
    .eq("id", unitId);
  if (error) throw error;
}

/** Current open cycle number (null if none). Used by UI dialogs to pick defaults. */
export async function getCurrentOpenCycleNumber(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("diesel_cycles")
    .select("cycle_number")
    .is("closed_at", null)
    .maybeSingle();
  return data?.cycle_number ?? null;
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
