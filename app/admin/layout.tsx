import { redirect } from "next/navigation";
import { getCurrentResident, isCommittee } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

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
      <AdminNav estateName={estateName} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
