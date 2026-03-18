import { createClient } from "@/lib/supabase/server";
import { UnitsTable, AddUnitButton } from "@/components/units/units-table";

export default async function UnitsPage() {
  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("*")
    .order("flat_number");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Unit Registry
        </h1>
        <AddUnitButton />
      </div>
      <UnitsTable units={units ?? []} />
    </div>
  );
}
