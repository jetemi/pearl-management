import { redirect } from "next/navigation";
import { getCurrentResident, isCommittee } from "@/lib/auth";

export default async function HomePage() {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  if (isCommittee(resident.role)) {
    redirect("/admin");
  }

  redirect("/my");
}
