/** Client-safe role types and helpers (no server imports). */

export type ResidentRole =
  | "resident"
  | "treasurer"
  | "secretary"
  | "chairman"
  | "facility_manager";

export interface Resident {
  id: string;
  unit_id: string | null;
  role: ResidentRole;
  /** Optional; used for WhatsApp (e.g. facility managers). */
  phone?: string | null;
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

export function isFacilityManager(role: ResidentRole): boolean {
  return role === "facility_manager";
}

export function canAccessAdminArea(role: ResidentRole): boolean {
  return isCommittee(role) || isFacilityManager(role);
}
