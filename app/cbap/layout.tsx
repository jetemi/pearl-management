import { requireCbapUser } from "@/lib/cbap/auth";
import { CbapNav } from "@/components/cbap/cbap-nav";

export default async function CbapLayout({ children }: { children: React.ReactNode }) {
  await requireCbapUser(); // redirects to /login if not signed in

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <CbapNav />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
