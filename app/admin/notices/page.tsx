import { createClient } from "@/lib/supabase/server";
import { NoticesView } from "@/components/notices/notices-view";
import { format } from "date-fns";

export default async function NoticesPage() {
  const supabase = await createClient();

  const { data: notices } = await supabase
    .from("notices")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false });

  const formattedNotices = (notices ?? []).map((n) => ({
    ...n,
    created_at_formatted: format(new Date(n.created_at), "MMM d, yyyy"),
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Notice Board
      </h1>
      <NoticesView notices={formattedNotices} />
    </div>
  );
}
