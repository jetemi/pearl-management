import { createClient } from "@/lib/supabase/server";
import type { Resident } from "./auth-roles";

export type { Resident, ResidentRole } from "./auth-roles";
export {
  canAccessAdminArea,
  isCommittee,
  isFacilityManager,
} from "./auth-roles";

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
      phone,
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
