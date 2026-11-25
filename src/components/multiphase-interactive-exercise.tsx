"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getScoreBadgeVariant,
  gradeInteractiveExercise,
} from "@/lib/scoring";
import {
  QUESTION_TYPE_LABELS,
  type AnswerEntry,
  type Assignment,
  type AssignmentPhase,
  type Question,
  type Submission,
  type SubmissionStatus,
} from "@/types/database";
import { AssignmentMediaPane } from "@/components/assignment-media-pane";
import { QuestionRenderer } from "@/components/question-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MultiPhaseInteractiveExerciseProps {
  assignment: Assignment;
  phases: AssignmentPhase[];
  questions: Question[];
  userId: string;
  stepId: string | null;
  existingSubmission: Submission | null;
}

interface PhaseGradeState {
  checked: boolean;
  percentageScore: number | null;
  gradedAnswers: Record<string, AnswerEntry>;
  hasManualReview: boolean;
}

export function MultiPhaseInteractiveExercise({
  assignment,
  phases,
  questions,
  userId,
  stepId,
  existingSubmission,
}: MultiPhaseInteractiveExerciseProps) {
  const router = useRouter();

  // Map questions to phases (unassigned questions default to first phase)
  const questionsByPhase = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const ph of phases) {
      map.set(ph.id, []);
    }
    const firstPhaseId = phases[0]?.id;
    for (const q of questions) {
      const targetPhaseId =
        q.question_data?.phase_id && map.has(q.question_data.phase_id)
          ? q.question_data.phase_id
          : firstPhaseId;
      if (targetPhaseId) {
        map.get(targetPhaseId)!.push(q);
      }
    }
    return map;
  }, [phases, questions]);

  const [submission, setSubmission] = useState<Submission | null>(
    existingSubmission
  );
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (existingSubmission?.answers) {
      for (const [qId, entry] of Object.entries(existingSubmission.answers)) {
        initial[qId] = entry?.answer ?? "";
      }
    }
    return initial;
  });

  // Initialize phaseResults from existingSubmission ONLY for phases that actually have saved answers
  const [phaseResults, setPhaseResults] = useState<
    Record<string, PhaseGradeState>
  >(() => {
    const initial: Record<string, PhaseGradeState> = {};
    if (existingSubmission && existingSubmission.answers) {
      const savedKeys = new Set(Object.keys(existingSubmission.answers));
      const rawMap: Record<string, string> = {};
      for (const [qId, entry] of Object.entries(existingSubmission.answers)) {
        rawMap[qId] = entry?.answer ?? "";
      }
      for (const ph of phases) {
        const phQs = questionsByPhase.get(ph.id) ?? [];
        const hasSavedForPhase =
          phQs.length > 0 && phQs.some((q) => savedKeys.has(q.id));
        if (hasSavedForPhase) {
          const graded = gradeInteractiveExercise(phQs, rawMap);
          initial[ph.id] = {
            checked: true,
            percentageScore: graded.percentageScore,
            gradedAnswers: graded.answers,
            hasManualReview: graded.openEndedCount > 0,
          };
        }
      }
    }
    return initial;
  });

  const [savingFinal, setSavingFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePhase = phases[activePhaseIdx];
  const activeQuestions = questionsByPhase.get(activePhase.id) ?? [];
  const activeResult = phaseResults[activePhase.id];
  const isPhaseChecked = Boolean(activeResult?.checked);
  const allPhasesChecked = phases.every((ph) => phaseResults[ph.id]?.checked);

  // Compute average of all scored phases
  const phaseScoresList = phases
    .map((ph) => phaseResults[ph.id]?.percentageScore)
    .filter((s): s is number => s !== null && s !== undefined);
  const overallAverage =
    phaseScoresList.length > 0
      ? Math.round(
          (phaseScoresList.reduce((acc, s) => acc + s, 0) /
            phaseScoresList.length) *
            100
        ) / 100
      : null;

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function persistAllPhases(
    nextResults: Record<string, PhaseGradeState>
  ) {
    setSavingFinal(true);
    setError(null);

    const mergedAnswers: Record<string, AnswerEntry> = {};
    const scores: number[] = [];
    let anyManual = false;

    for (const ph of phases) {
      const r = nextResults[ph.id];
      if (!r) continue;
      Object.assign(mergedAnswers, r.gradedAnswers);
      if (r.percentageScore !== null) scores.push(r.percentageScore);
      if (r.hasManualReview) anyManual = true;
    }

    const avgScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, v) => sum + v, 0) / scores.length) * 100
          ) / 100
        : null;
    const status: SubmissionStatus = anyManual ? "PENDING_REVIEW" : "COMPLETED";

    const supabase = createClient();
    const { data, error: upsertError } = await supabase
      .from("submissions")
      .upsert(
        {
          user_id: userId,
          assignment_id: assignment.id,
          step_id: stepId,
          status,
          percentage_score: avgScore,
          answers: mergedAnswers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,assignment_id" }
      )
      .select()
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingFinal(false);
      return;
    }

    setSubmission(data as Submission);
    setSavingFinal(false);
    router.refresh();
  }

  async function handleCheckCurrentPhase() {
    setError(null);

    const graded = gradeInteractiveExercise(activeQuestions, answers);
    const nextResults: Record<string, PhaseGradeState> = {
      ...phaseResults,
      [activePhase.id]: {
        checked: true,
        percentageScore: graded.percentageScore,
        gradedAnswers: graded.answers,
        hasManualReview: graded.openEndedCount > 0,
      },
    };
    setPhaseResults(nextResults);

    // If every phase is now checked, save the overall averaged submission immediately
    const allDone = phases.every((ph) => nextResults[ph.id]?.checked);
    if (allDone) {
      await persistAllPhases(nextResults);
    }
  }

  function handleRetakeAll() {
    setPhaseResults({});
    setActivePhaseIdx(0);
    setError(null);
  }

  const hasPhaseMedia =
    activePhase.media_type !== "NONE" && Boolean(activePhase.media_content);

  return (
    <div className="space-y-6">
      {/* Overall Completion Summary Banner (when all phases are checked) */}
      {allPhasesChecked && (
        <div
          className={cn(
            "rounded-2xl border p-5 shadow-xs",
            submission?.status === "PENDING_REVIEW"
              ? "border-[#9A6B2F]/40 bg-[#9A6B2F]/10"
              : "border-[#3E6B52]/40 bg-[#3E6B52]/10"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {submission?.status === "PENDING_REVIEW" ? (
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[#9A6B2F]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#3E6B52]" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    All {phases.length} Phases Completed
                  </h2>
                  {overallAverage !== null && (
                    <Badge variant={getScoreBadgeVariant(overallAverage)}>
                      Final Average: {Math.round(overallAverage)}%
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {phases.map((ph, idx) => {
                    const res = phaseResults[ph.id];
                    return (
                      <span
                        key={ph.id}
                        className="inline-flex items-center rounded-sm border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                      >
                        Part {idx + 1}:{" "}
                        <strong className="ml-1 text-[#0f2544]">
                          {res?.percentageScore !== null &&
                          res?.percentageScore !== undefined
                            ? `${Math.round(res.percentageScore)}%`
                            : "Submitted"}
                        </strong>
                      </span>
                    );
                  })}
                </div>
                {submission?.admin_feedback && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3.5 text-sm text-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Teacher Feedback
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {submission.admin_feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetakeAll}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retake All Phases
            </Button>
          </div>
        </div>
      )}

      {/* Phase Stepper Navigation */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {phases.map((ph, idx) => {
          const res = phaseResults[ph.id];
          const done = Boolean(res?.checked);
          const prevDone =
            idx === 0 || Boolean(phaseResults[phases[idx - 1].id]?.checked);
          const unlocked = prevDone || allPhasesChecked;
          const isActive = idx === activePhaseIdx;

          return (
            <button
              key={ph.id}
              type="button"
              disabled={!unlocked}
              onClick={() => setActivePhaseIdx(idx)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all",
                unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-55",
                isActive
                  ? "border-[#0f2544] bg-[#0f2544] text-white"
                  : done
                    ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200/70"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {done ? (
                <CheckCircle2
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive ? "text-emerald-300" : "text-[#3E6B52]"
                  )}
                />
              ) : !unlocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-slate-200 text-[10px] font-bold text-slate-700">
                  {idx + 1}
                </span>
              )}
              <span>{ph.title || `Part ${idx + 1}`}</span>
              {done &&
                res?.percentageScore !== null &&
                res?.percentageScore !== undefined && (
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-[#0f2544]"
                    )}
                  >
                    {Math.round(res.percentageScore)}%
                  </span>
                )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Phase Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phase {activePhaseIdx + 1} of {phases.length}
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-[#0f2544]">
              {activePhase.title || `Part ${activePhaseIdx + 1}`}
            </h2>
          </div>
          {isPhaseChecked && activeResult?.percentageScore !== null && (
            <Badge
              variant={getScoreBadgeVariant(activeResult.percentageScore)}
            >
              Phase {activePhaseIdx + 1} Score:{" "}
              {Math.round(activeResult.percentageScore)}%
            </Badge>
          )}
        </div>
        {activePhase.instructions && (
          <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">
            {activePhase.instructions}
          </p>
        )}
      </div>

      {/* Phase Split-Screen (Media on Left + Questions on Right) */}
      <div
        className={cn(
          hasPhaseMedia ? "grid gap-6 lg:grid-cols-2 lg:items-start" : ""
        )}
      >
        {hasPhaseMedia && (
          <div className="lg:sticky lg:top-20">
            <AssignmentMediaPane
              mediaType={activePhase.media_type}
              mediaContent={activePhase.media_content ?? null}
              title={activePhase.title || assignment.title}
              startTime={activePhase.start_time}
              endTime={activePhase.end_time}
              audioOnly={Boolean(activePhase.audio_only)}
            />
          </div>
        )}

        <div className="space-y-5">
          {activeQuestions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No questions assigned to this phase yet.
            </div>
          ) : (
            activeQuestions.map((q, index) => {
              const userVal = answers[q.id] ?? "";
              const gradedEntry = activeResult?.gradedAnswers?.[q.id];
              const isCorrect = gradedEntry?.is_correct === true;
              const isWrong = gradedEntry?.is_correct === false;

              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-2xl border bg-white p-5 shadow-xs transition-colors",
                    isPhaseChecked && isWrong
                      ? "border-[#8B3A3A]/50 bg-[#8B3A3A]/5"
                      : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0f2544] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {QUESTION_TYPE_LABELS[q.question_type]}
                      </span>
                      {q.keyword && (
                        <Badge className="border-slate-300 bg-slate-100 font-mono text-slate-800">
                          KEYWORD: {q.keyword}
                        </Badge>
                      )}
                    </div>

                    {isPhaseChecked &&
                      q.question_type !== "OPEN_ENDED" &&
                      q.question_type !== "SPEAKING_RECORDING" && (
                        <div>
                          {isCorrect ? (
                            <Badge variant="success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              Needs Review
                            </Badge>
                          )}
                        </div>
                      )}
                  </div>

                  <QuestionRenderer
                    question={q}
                    userId={userId}
                    value={userVal}
                    onChange={(val) => setAnswer(q.id, val)}
                    isReviewMode={isPhaseChecked}
                    gradedEntry={gradedEntry}
                  />

                  {isPhaseChecked && q.explanation && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                      <div>
                        <span className="font-semibold text-[#0f2544]">
                          Explanation:{" "}
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Phase Action Bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {!isPhaseChecked ? (
              <Button
                key={`check-${activePhase.id}`}
                type="button"
                variant="accent"
                size="lg"
                disabled={savingFinal}
                onClick={handleCheckCurrentPhase}
              >
                {savingFinal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {activePhaseIdx === phases.length - 1
                  ? `Check Phase ${activePhaseIdx + 1} & Save Final Score`
                  : `Check Phase ${activePhaseIdx + 1} Answers`}
              </Button>
            ) : (
              activePhaseIdx < phases.length - 1 && (
                <Button
                  key={`next-${activePhase.id}`}
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={() => setActivePhaseIdx((i) => i + 1)}
                >
                  Continue to Phase {activePhaseIdx + 2}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
