import { requireAuth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ProfileSettingsForm } from "@/components/profile-settings-form";

export default async function UserProfilePage() {
  const { profile } = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f2544]">User Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your account details and target Cambridge exam level.
          </p>
        </div>

        <ProfileSettingsForm profile={profile} />
      </main>
    </div>
  );
}
