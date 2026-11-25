import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type Question,
  type Submission,
} from "@/types/database";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { AssignmentMediaPane } from "@/components/assignment-media-pane";
import { ExerciseReportButton } from "@/components/exercise-report-button";
import { ExternalLinkExercise } from "@/components/external-link-exercise";
import { InteractiveExercise } from "@/components/interactive-exercise";
import { MultiPhaseInteractiveExercise } from "@/components/multiphase-interactive-exercise";
import { cn } from "@/lib/utils";

interface AssignmentPageProps {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ stepId?: string }>;
}

export default async function AssignmentPage({
  params,
  searchParams,
}: AssignmentPageProps) {
  const { assignmentId } = await params;
  const { stepId } = await searchParams;
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const [
    { data: assignmentData },
    { data: questionsData },
    { data: submissionData },
  ] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", assignmentId).single(),
    supabase
      .from("questions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("order_index", { ascending: true }),
    supabase
      .from("submissions")
      .select("*")
      .eq("user_id", profile.id)
      .eq("assignment_id", assignmentId)
      .maybeSingle(),
  ]);

  const assignment = assignmentData as Assignment | null;
  if (!assignment) {
    notFound();
  }

  const questions = (questionsData as Question[]) ?? [];
  const submission = (submissionData as Submission | null) ?? null;

  const phases = Array.isArray(assignment.phases) ? assignment.phases : [];
  const isMultiPhase =
    assignment.assignment_type === "INTERACTIVE_EXERCISE" && phases.length > 0;

  const hasMedia =
    !isMultiPhase &&
    assignment.media_type !== "NONE" &&
    Boolean(assignment.media_content);
  const catStyle = CATEGORY_COLORS[assignment.category];
  const backHref = stepId ? `/steps/${stepId}` : "/dashboard";

  const exerciseContent =
    assignment.assignment_type === "EXTERNAL_LINK" ? (
      <ExternalLinkExercise
        assignment={assignment}
        userId={profile.id}
        stepId={stepId ?? null}
        existingSubmission={submission}
      />
    ) : isMultiPhase ? (
      <MultiPhaseInteractiveExercise
        assignment={assignment}
        phases={phases}
        questions={questions}
        userId={profile.id}
        stepId={stepId ?? null}
        existingSubmission={submission}
      />
    ) : (
      <InteractiveExercise
        assignment={assignment}
        questions={questions}
        userId={profile.id}
        stepId={stepId ?? null}
        existingSubmission={submission}
      />
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main
        className={cn(
          "mx-auto px-4 py-6 sm:px-6 lg:px-8",
          hasMedia || isMultiPhase ? "max-w-7xl" : "max-w-4xl"
        )}
      >
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0f2544]"
        >
          <ArrowLeft className="h-4 w-4" />
          {stepId ? "Back to Step" : "Back to Study Path"}
        </Link>

        {/* Assignment Title & Instructions */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{EXAM_LEVEL_LABELS[assignment.level]}</Badge>
              <span
                className={cn(
                  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-medium",
                  catStyle.bg,
                  catStyle.text,
                  catStyle.border
                )}
              >
                {CATEGORY_LABELS[assignment.category]}
              </span>
            </div>
            <ExerciseReportButton
              userId={profile.id}
              assignmentId={assignment.id}
              assignmentTitle={assignment.title}
              questions={questions.map((q, idx) => ({
                id: q.id,
                label: `Q${idx + 1}: ${q.prompt.slice(0, 60)}${q.prompt.length > 60 ? "..." : ""}`,
              }))}
            />
          </div>
          <h1 className="mt-2.5 text-2xl font-bold text-[#0f2544]">
            {assignment.title}
          </h1>
          {assignment.instructions && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {assignment.instructions}
            </p>
          )}
        </div>

        {/* Desktop Split-Screen when media_type !== 'NONE', otherwise single column */}
        {hasMedia ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="lg:sticky lg:top-20">
              <AssignmentMediaPane
                mediaType={assignment.media_type}
                mediaContent={assignment.media_content}
                title={assignment.title}
                startTime={assignment.media_start_time}
                endTime={assignment.media_end_time}
                audioOnly={Boolean(assignment.media_audio_only)}
              />
            </div>
            <div>{exerciseContent}</div>
          </div>
        ) : (
          <div className="mt-6">{exerciseContent}</div>
        )}
      </main>
    </div>
  );
}
