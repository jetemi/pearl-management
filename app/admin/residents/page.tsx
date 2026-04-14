import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import type { ResidentRole } from "@/lib/auth-roles";
import { ResidentsTable } from "@/components/residents/residents-table";

type DirectoryRow = {
  id: string;
  unit_id: string | null;
  role: string;
  phone: string | null;
  flat_number: string | null;
  owner_name: string | null;
  unit_phone: string | null;
  auth_email: string | null;
};

export default async function ResidentsPage() {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  if (resident.role !== "chairman") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
        <p className="text-amber-800 dark:text-amber-200">
          Only the chairman can manage resident roles.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc(
    "get_residents_directory_for_chairman"
  );

  if (error) {
    throw new Error(error.message);
  }

  const residents = (rows as DirectoryRow[] | null)?.map((r) => ({
    id: r.id,
    unit_id: r.unit_id,
    role: r.role as ResidentRole,
    phone: r.phone,
    auth_email: r.auth_email,
    units:
      r.unit_id == null
        ? null
        : {
            flat_number: r.flat_number ?? "",
            owner_name: r.owner_name ?? "",
            phone: r.unit_phone,
          },
  }));

  const sorted = (residents ?? []).sort((a, b) => {
    const getFlat = (u: {
      units?: { flat_number?: string } | { flat_number?: string }[] | null;
    }) =>
      Array.isArray(u.units)
        ? u.units[0]?.flat_number ?? ""
        : u.units?.flat_number ?? "";
    const flatA = getFlat(a);
    const flatB = getFlat(b);
    if (flatA !== flatB) return flatA.localeCompare(flatB, undefined, { numeric: true });
    const roleOrder = {
      chairman: 0,
      treasurer: 1,
      secretary: 2,
      resident: 3,
      facility_manager: 4,
    };
    return (
      roleOrder[a.role as keyof typeof roleOrder] -
      roleOrder[b.role as keyof typeof roleOrder]
    );
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Residents & Roles
      </h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Change resident roles and optional WhatsApp numbers. Facility managers
        use their auth email for request notifications; use the phone column
        (or unit registry phone) for WhatsApp share links.
      </p>
      <ResidentsTable residents={sorted} />
    </div>
  );
}
