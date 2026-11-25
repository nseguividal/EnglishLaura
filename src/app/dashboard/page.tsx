import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeStepProgression } from "@/lib/steps";
import {
  EXAM_LEVEL_DESCRIPTIONS,
  EXAM_LEVEL_LABELS,
  type Step,
  type StepAssignment,
  type Submission,
} from "@/types/database";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { profile } = await requireAuth();

  if (!profile.selected_level) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const level = profile.selected_level;

  const [{ data: stepsData }, { data: submissionsData }] = await Promise.all([
    supabase
      .from("steps")
      .select("*")
      .eq("level", level)
      .eq("is_published", true)
      .order("step_number", { ascending: true }),
    supabase.from("submissions").select("*").eq("user_id", profile.id),
  ]);

  const steps = (stepsData as Step[]) ?? [];
  const stepIds = steps.map((s) => s.id);

  let stepAssignments: Pick<StepAssignment, "step_id" | "assignment_id">[] = [];
  if (stepIds.length > 0) {
    const { data: saData } = await supabase
      .from("step_assignments")
      .select("step_id, assignment_id, assignment:assignments!inner(id, is_published)")
      .in("step_id", stepIds)
      .eq("assignment.is_published", true)
      .order("order_index", { ascending: true });
    stepAssignments =
      (saData as Pick<StepAssignment, "step_id" | "assignment_id">[]) ?? [];
  }

  const submissions = (submissionsData as Submission[]) ?? [];
  const progression = computeStepProgression(steps, stepAssignments, submissions);

  const completedStepsCount = progression.filter(
    (p) => p.status === "COMPLETED"
  ).length;
  const totalLevelAssignments = new Set(
    stepAssignments.map((sa) => sa.assignment_id)
  );
  const levelSubmissions = submissions.filter((s) =>
    totalLevelAssignments.has(s.assignment_id)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Clean Level Header */}
        <div className="rounded-2xl bg-[#0f2544] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                {EXAM_LEVEL_LABELS[level]} Track
              </span>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                Your Study Path
              </h1>
              <p className="mt-1 text-sm text-slate-200">
                {EXAM_LEVEL_DESCRIPTIONS[level]}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/analytics">
                  <TrendingUp className="h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
              <div className="flex items-center gap-3 text-sm">
                <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs">
                  <p className="text-[11px] text-slate-200">Steps</p>
                  <p className="text-lg font-bold">
                    {completedStepsCount}/{progression.length}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs">
                  <p className="text-[11px] text-slate-200">Completed</p>
                  <p className="text-lg font-bold">
                    {levelSubmissions.length}/{totalLevelAssignments.size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Sequential Step Path */}
        <section className="mt-8">
          {progression.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <BookOpen className="h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  No steps published yet for {EXAM_LEVEL_LABELS[level]}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Switch levels in the header or check back once your teacher
                  publishes modules.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative space-y-5">
              {/* Vertical connector line */}
              <div
                aria-hidden="true"
                className="absolute top-8 bottom-8 left-7 hidden w-0.5 bg-slate-200 sm:block"
              />

              {progression.map((item, idx) => {
                const {
                  step,
                  totalAssignments,
                  completedAssignments,
                  progressPercent,
                  status,
                } = item;
                const isCompleted = status === "COMPLETED";
                const isCurrent = status === "CURRENT";
                const isLocked = status === "LOCKED";

                const stepAlignment = isLocked ? "md:ml-8" : "md:mr-8";

                const cardBody = (
                  <div
                    className={cn(
                      "relative flex flex-col gap-4 rounded-2xl border p-5 transition-all sm:flex-row sm:items-center sm:p-6",
                      isCompleted &&
                        "border-[#3E6B52]/40 bg-white hover:border-[#3E6B52]/70 hover:shadow-sm",
                      isCurrent &&
                        "border-[#0f2544] bg-white ring-1 ring-[#0f2544]/15 shadow-sm hover:shadow-md",
                      isLocked &&
                        "cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-75"
                    )}
                  >
                    {/* Step Node Icon */}
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs",
                        isCompleted && "bg-[#3E6B52] text-white",
                        isCurrent && "bg-[#0f2544] text-white",
                        isLocked && "bg-slate-200 text-slate-500"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-7 w-7" />
                      ) : isLocked ? (
                        <Lock className="h-6 w-6" />
                      ) : (
                        <span className="text-lg">{step.step_number}</span>
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Step {step.step_number}
                        </span>
                        {isCompleted && (
                          <Badge variant="success">
                            <Award className="h-3 w-3" />
                            Completed
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="bg-[#0f2544] text-white">
                            Current Module
                          </Badge>
                        )}
                        {isLocked && (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                      </div>

                      <h3
                        className={cn(
                          "mt-1 text-lg font-bold",
                          isLocked ? "text-slate-600" : "text-[#0f2544]"
                        )}
                      >
                        {step.title}
                      </h3>
                      {step.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {step.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="mt-4 max-w-md">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-600">
                            {completedAssignments}/{totalAssignments} completed
                          </span>
                          <span
                            className={cn(
                              isCompleted
                                ? "text-emerald-700"
                                : isCurrent
                                  ? "text-[#0f766e]"
                                  : "text-slate-500"
                            )}
                          >
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress
                          value={progressPercent}
                          indicatorClassName={
                            isCompleted
                              ? "bg-[#3E6B52]"
                              : isLocked
                                ? "bg-slate-400"
                                : "bg-[#0f2544]"
                          }
                        />
                      </div>

                      {isLocked && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          Complete all assignments in Step{" "}
                          {progression[idx - 1]?.step.step_number} to unlock.
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-200/70 px-3.5 py-2 text-xs font-medium text-slate-500">
                          <Lock className="h-3.5 w-3.5" />
                          Locked
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                            isCurrent
                              ? "bg-[#0f766e] text-white"
                              : "border border-slate-200 bg-slate-50 text-[#0f2544]"
                          )}
                        >
                          {isCompleted ? "Review Step" : "Continue Step"}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                );

                return (
                  <div key={step.id} className={cn("relative", stepAlignment)}>
                    {isLocked ? (
                      <div aria-disabled="true">{cardBody}</div>
                    ) : (
                      <Link href={`/steps/${step.id}`} className="block">
                        {cardBody}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
