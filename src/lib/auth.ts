import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentUserProfile(): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { user: null, profile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as Profile | null) ?? null };
}

export async function requireAuth(): Promise<{
  user: { id: string; email?: string };
  profile: Profile;
}> {
  const { user, profile } = await getCurrentUserProfile();
  if (!user || !profile) {
    redirect("/login");
  }
  return { user, profile };
}

export async function requireAdmin(): Promise<{
  user: { id: string; email?: string };
  profile: Profile;
}> {
  const { user, profile } = await requireAuth();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }
  return { user, profile };
}
