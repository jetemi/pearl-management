import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentResident } from "@/lib/auth";

export default async function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  if (!resident.unit_id) {
    redirect("/my");
  }

  const flatNumber = resident.units?.flat_number ?? "Unit";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {flatNumber} &middot; Household
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/my"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              My Page
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
