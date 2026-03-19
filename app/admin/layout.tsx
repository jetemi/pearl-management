import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentResident, isCommittee } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  if (!isCommittee(resident.role)) {
    redirect("/my");
  }

  const estateName =
    process.env.NEXT_PUBLIC_ESTATE_NAME ?? "Estate Management";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full border-b border-zinc-200 bg-zinc-50 px-4 py-4 md:w-56 md:border-b-0 md:border-r md:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 md:dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          {estateName}
        </h2>
        <nav className="flex flex-wrap gap-2 md:flex-col md:gap-0">
          <Link
            href="/admin"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Overview
          </Link>
          <Link
            href="/admin/units"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Units
          </Link>
          <Link
            href="/admin/diesel"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Diesel Fund
          </Link>
          <Link
            href="/admin/service-charge"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Service Charge
          </Link>
          <Link
            href="/admin/facility"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Facility
          </Link>
          <Link
            href="/admin/reports"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Reports
          </Link>
          <Link
            href="/admin/notices"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Notices
          </Link>
          <Link
            href="/admin/residents"
            className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Residents
          </Link>
        </nav>
        <div className="mt-auto pt-4">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
