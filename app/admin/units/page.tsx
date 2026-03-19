import { createClient } from "@/lib/supabase/server";
import { UnitsTable, AddUnitButton, ImportUnitsButton } from "@/components/units/units-table";

export default async function UnitsPage() {
  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("*")
    .order("flat_number");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Unit Registry
        </h1>
        <div className="flex gap-2">
          <ImportUnitsButton />
          <AddUnitButton />
        </div>
      </div>
      <UnitsTable units={units ?? []} />
    </div>
  );
}
