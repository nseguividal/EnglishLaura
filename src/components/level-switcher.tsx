"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExamLevel } from "@/types/database";
import { cn } from "@/lib/utils";

interface LevelSwitcherProps {
  currentLevel: ExamLevel;
  userId: string;
}

export function LevelSwitcher({ currentLevel, userId }: LevelSwitcherProps) {
  const [level, setLevel] = useState<ExamLevel>(currentLevel);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSwitch(nextLevel: ExamLevel) {
    if (nextLevel === level || isPending) return;
    setLevel(nextLevel);

    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ selected_level: nextLevel })
      .eq("id", userId);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium"
      role="group"
      aria-label="Select Cambridge Exam Level"
    >
      {(["B2_FIRST", "C1_ADVANCED"] as ExamLevel[]).map((lvl) => {
        const active = level === lvl;
        return (
          <button
            key={lvl}
            type="button"
            disabled={isPending}
            onClick={() => handleSwitch(lvl)}
            className={cn(
              "rounded-md px-2.5 py-1 transition-all cursor-pointer",
              active
                ? "bg-[#0f2544] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {lvl === "B2_FIRST" ? "B2 First" : "C1 Advanced"}
          </button>
        );
      })}
    </div>
  );
}
