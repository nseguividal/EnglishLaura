import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  ListChecks,
  Video,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeStepProgression } from "@/lib/steps";
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type AssignmentCategory,
  type Step,
  type StepAssignment,
  type Submission,
} from "@/types/database";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StepPageProps {
  params: Promise<{ stepId: string }>;
}

export default async function StepDetailPage({ params }: StepPageProps) {
  const { stepId } = await params;
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: stepData } = await supabase
    .from("steps")
    .select("*")
    .eq("id", stepId)
    .single();

  const step = stepData as Step | null;
  if (!step) {
    notFound();
  }

  // Fetch all steps in this level + step_assignments + student submissions to verify lock status
  const [{ data: levelStepsData }, { data: submissionsData }] =
    await Promise.all([
      supabase
        .from("steps")
        .select("*")
        .eq("level", step.level)
        .eq("is_published", true)
        .order("step_number", { ascending: true }),
      supabase.from("submissions").select("*").eq("user_id", profile.id),
    ]);

  const levelSteps = (levelStepsData as Step[]) ?? [];
  const levelStepIds = levelSteps.map((s) => s.id);
  const submissions = (submissionsData as Submission[]) ?? [];

  const { data: allSaData } = await supabase
    .from("step_assignments")
    .select("*, assignment:assignments(*)")
    .in("step_id", levelStepIds.length > 0 ? levelStepIds : [stepId])
    .order("order_index", { ascending: true });

  const allStepAssignments = ((allSaData as StepAssignment[]) ?? []).filter(
    (sa) => sa.assignment && (sa.assignment.is_published || profile.role === "admin")
  );

  const progression = computeStepProgression(
    levelSteps,
    allStepAssignments,
    submissions
  );
  const currentProgress = progression.find((p) => p.step.id === step.id);

  // Enforce sequential locking server-side for students
  if (
    profile.role !== "admin" &&
    (!currentProgress || currentProgress.status === "LOCKED")
  ) {
    redirect("/dashboard");
  }

  const submissionByAssignment = new Map<string, Submission>();
  for (const sub of submissions) {
    submissionByAssignment.set(sub.assignment_id, sub);
  }

  const thisStepAssignments = allStepAssignments
    .filter((sa) => sa.step_id === step.id && sa.assignment)
    .map((sa) => sa.assignment as Assignment);

  // Group assignments by Category
  const groupedByCategory = new Map<AssignmentCategory, Assignment[]>();
  for (const category of ALL_CATEGORIES) {
    const items = thisStepAssignments.filter((a) => a.category === category);
    if (items.length > 0) {
      groupedByCategory.set(category, items);
    }
  }

  const completedCount = thisStepAssignments.filter((a) =>
    submissionByAssignment.has(a.id)
  ).length;
  const totalCount = thisStepAssignments.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0f2544]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Study Path
        </Link>

        {/* Step Header */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{EXAM_LEVEL_LABELS[step.level]}</Badge>
            <Badge variant="secondary">Step {step.step_number}</Badge>
            {progressPct === 100 && totalCount > 0 && (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" />
                Step Completed
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-[#0f2544] sm:text-3xl">
            {step.title}
          </h1>
          {step.description && (
            <p className="mt-2 text-sm text-slate-600">{step.description}</p>
          )}

          <div className="mt-6 max-w-lg">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                {completedCount} of {totalCount} assignments completed
              </span>
              <span className="font-semibold text-[#0f766e]">
                {progressPct}%
              </span>
            </div>
            <Progress value={progressPct} />
          </div>
        </div>

        {/* Grouped Assignments by Category */}
        <div className="mt-8 space-y-8">
          {Array.from(groupedByCategory.entries()).map(
            ([category, assignments]) => {
              const style = CATEGORY_COLORS[category];
              return (
                <section key={category}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold",
                        style.bg,
                        style.text,
                        style.border
                      )}
                    >
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {assignments.length}{" "}
                      {assignments.length === 1 ? "assignment" : "assignments"}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    {assignments.map((assignment) => {
                      const sub = submissionByAssignment.get(assignment.id);
                      const isDone = Boolean(sub);
                      return (
                        <Link
                          key={assignment.id}
                          href={`/assignments/${assignment.id}?stepId=${step.id}`}
                          className={cn(
                            "group flex flex-col justify-between gap-4 rounded-xl border bg-white p-5 transition-all hover:border-[#0f2544]/50 hover:shadow-sm sm:flex-row sm:items-center",
                            isDone ? "border-[#3E6B52]/40" : "border-slate-200"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                {assignment.assignment_type ===
                                "EXTERNAL_LINK" ? (
                                  <>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    External Resource
                                  </>
                                ) : (
                                  <>
                                    <ListChecks className="h-3.5 w-3.5" />
                                    Interactive Exercise
                                  </>
                                )}
                              </span>

                              {assignment.media_type === "READING_PASSAGE" && (
                                <Badge variant="outline" className="text-[11px]">
                                  <FileText className="h-3 w-3" />
                                  Reading Passage
                                </Badge>
                              )}
                              {assignment.media_type === "VIDEO_URL" && (
                                <Badge variant="outline" className="text-[11px]">
                                  <Video className="h-3 w-3" />
                                  Video
                                </Badge>
                              )}
                              {assignment.media_type === "AUDIO_MP4_UPLOAD" && (
                                <Badge variant="outline" className="text-[11px]">
                                  <Headphones className="h-3 w-3" />
                                  Audio / Media
                                </Badge>
                              )}
                            </div>

                            <h3 className="mt-1.5 text-base font-semibold text-[#0f2544] group-hover:text-[#0f766e]">
                              {assignment.title}
                            </h3>
                            {assignment.instructions && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                {assignment.instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            {sub ? (
                              sub.status === "PENDING_REVIEW" ? (
                                <Badge variant="warning">
                                  <Clock className="h-3 w-3" />
                                  Pending Grade
                                </Badge>
                              ) : (
                                <Badge variant="success">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {sub.percentage_score !== null
                                    ? `${Math.round(Number(sub.percentage_score))}%`
                                    : "Completed"}
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary">Not Started</Badge>
                            )}

                            <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0f766e]">
                              {isDone ? "Review" : "Start"}
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            }
          )}

          {thisStepAssignments.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-600">
                No assignments are linked to this step yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
