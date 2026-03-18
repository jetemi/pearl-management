import { createClient } from "@/lib/supabase/server";

export type ResidentRole = "resident" | "treasurer" | "secretary" | "chairman";

export interface Resident {
  id: string;
  unit_id: string | null;
  role: ResidentRole;
  created_at: string;
  units?: {
    flat_number: string;
    owner_name: string;
  } | null;
}

const COMMITTEE_ROLES: ResidentRole[] = ["treasurer", "secretary", "chairman"];

export function isCommittee(role: ResidentRole): boolean {
  return COMMITTEE_ROLES.includes(role);
}

export async function getCurrentResident(): Promise<Resident | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: resident } = await supabase
    .from("residents")
    .select(
      `
      id,
      unit_id,
      role,
      created_at,
      units (
        flat_number,
        owner_name
      )
    `
    )
    .eq("id", user.id)
    .single();

  return resident as Resident | null;
}
