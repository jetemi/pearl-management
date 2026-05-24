import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * CBAP auth: requires any signed-in Supabase user.
 * Deliberately does NOT use getCurrentResident()/residents — keeps CBAP detachable.
 */
export async function requireCbapUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
