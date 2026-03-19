import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import { ResidentsTable } from "@/components/residents/residents-table";

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
  const { data: residents } = await supabase
    .from("residents")
    .select(
      `
      id,
      unit_id,
      role,
      phone,
      units (
        flat_number,
        owner_name,
        phone
      )
    `
    );

  const sorted = (residents ?? []).sort((a, b) => {
    const getFlat = (u: { units?: { flat_number?: string } | { flat_number?: string }[] | null }) =>
      Array.isArray(u.units) ? u.units[0]?.flat_number ?? "" : u.units?.flat_number ?? "";
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
    return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
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
