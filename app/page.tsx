import { redirect } from "next/navigation";
import { getCurrentResident } from "@/lib/auth";

export default async function HomePage() {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  // /my is the default for all users (residents and committee)
  redirect("/my");
}
