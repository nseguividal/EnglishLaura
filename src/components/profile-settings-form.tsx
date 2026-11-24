"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ExamLevel, Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileSettingsFormProps {
  profile: Profile;
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>(
    profile.selected_level ?? "B2_FIRST"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        selected_level: selectedLevel,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {/* Standard person silhouette avatar in a circle */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-slate-500">
            <User className="h-8 w-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl text-[#0f2544]">
                {profile.full_name || "Your Profile"}
              </CardTitle>
              <Badge variant="secondary" className="uppercase">
                {profile.role}
              </Badge>
            </div>
            <CardDescription className="mt-0.5">
              {profile.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profileFullName">Full Name</Label>
              <Input
                id="profileFullName"
                type="text"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profileLevel">Target Cambridge Level</Label>
              <Select
                id="profileLevel"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as ExamLevel)}
              >
                <option value="B2_FIRST">B2 First (FCE)</option>
                <option value="C1_ADVANCED">C1 Advanced (CAE)</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Changes Saved" : "Save Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
