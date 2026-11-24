import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { OnboardingClient } from "@/app/onboarding/onboarding-client";

export default async function OnboardingPage() {
  const { profile } = await requireAuth();

  if (profile.selected_level) {
    redirect("/dashboard");
  }

  return <OnboardingClient userId={profile.id} fullName={profile.full_name} />;
}
