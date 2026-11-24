"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, Check, GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EXAM_LEVEL_DESCRIPTIONS,
  EXAM_LEVEL_LABELS,
  type ExamLevel,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingClientProps {
  userId: string;
  fullName: string;
}

export function OnboardingClient({ userId, fullName }: OnboardingClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ExamLevel>("B2_FIRST");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ selected_level: selected })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5 font-bold text-[#0f2544]">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2544] text-white">
          <BookOpenCheck className="h-5 w-5" />
        </span>
        <span className="text-xl tracking-tight">
          Cambridge<span className="text-[#0f766e]">Prep</span>
        </span>
      </div>

      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0f766e]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Welcome{fullName ? `, ${fullName}` : ""}! Choose your exam level
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select your target Cambridge English qualification. You can switch
            levels anytime from the header.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(["B2_FIRST", "C1_ADVANCED"] as ExamLevel[]).map((level) => {
            const active = selected === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setSelected(level)}
                className={cn(
                  "relative flex flex-col items-start rounded-xl border-2 p-6 text-left transition-all cursor-pointer",
                  active
                    ? "border-[#0f766e] bg-teal-50/40 ring-2 ring-[#0f766e]/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">
                    {level === "B2_FIRST" ? "CEFR B2" : "CEFR C1"}
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      active
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-slate-300"
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold text-[#0f2544]">
                  {EXAM_LEVEL_LABELS[level]}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {EXAM_LEVEL_DESCRIPTIONS[level]}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            variant="accent"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue to Study Path
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
