"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
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
  type Assignment,
  type Question,
  type Submission,
} from "@/types/database";
import { QuestionRenderer } from "@/components/question-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InteractiveExerciseProps {
  assignment: Assignment;
  questions: Question[];
  userId: string;
  stepId: string | null;
  existingSubmission: Submission | null;
}

export function InteractiveExercise({
  assignment,
  questions,
  userId,
  stepId,
  existingSubmission,
}: InteractiveExerciseProps) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(
    existingSubmission
  );
  const [isReviewMode, setIsReviewMode] = useState<boolean>(
    Boolean(existingSubmission)
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (existingSubmission?.answers) {
      for (const [qId, entry] of Object.entries(existingSubmission.answers)) {
        initial[qId] = entry?.answer ?? "";
      }
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const graded = gradeInteractiveExercise(questions, answers);

    const supabase = createClient();
    const { data, error: upsertError } = await supabase
      .from("submissions")
      .upsert(
        {
          user_id: userId,
          assignment_id: assignment.id,
          step_id: stepId,
          status: graded.status,
          percentage_score: graded.percentageScore,
          answers: graded.answers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,assignment_id" }
      )
      .select()
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSubmitting(false);
      return;
    }

    setSubmission(data as Submission);
    setIsReviewMode(true);
    setSubmitting(false);
    router.refresh();
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          No questions have been added to this interactive exercise yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Submission Result Banner */}
      {isReviewMode && submission && (
        <div
          className={cn(
            "rounded-2xl border p-5 shadow-xs",
            submission.status === "PENDING_REVIEW"
              ? "border-[#9A6B2F]/40 bg-[#9A6B2F]/10"
              : "border-[#3E6B52]/40 bg-[#3E6B52]/10"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {submission.status === "PENDING_REVIEW" ? (
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[#9A6B2F]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#3E6B52]" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {submission.status === "PENDING_REVIEW"
                      ? "Submitted — Pending Teacher Review"
                      : submission.status === "GRADED"
                        ? "Graded by Teacher"
                        : "Exercise Completed — Mistake Review"}
                  </h2>
                  {submission.percentage_score !== null && (
                    <Badge
                      variant={getScoreBadgeVariant(
                        submission.percentage_score
                      )}
                    >
                      Score: {Math.round(Number(submission.percentage_score))}%
                    </Badge>
                  )}
                </div>
                {submission.status === "PENDING_REVIEW" && (
                  <p className="mt-1 text-sm text-slate-600">
                    Your open-ended writing response has been saved for manual
                    grading, and this assignment counts toward unlocking your
                    next step.
                  </p>
                )}
                {submission.admin_feedback && (
                  <div className="mt-3 rounded-xl border border-[#3E6B52]/30 bg-white p-3.5 text-sm text-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#3E6B52]">
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
              onClick={() => setIsReviewMode(false)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retake Exercise
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((q, index) => {
          const userVal = answers[q.id] ?? "";
          const gradedEntry = submission?.answers?.[q.id];
          const isCorrect = gradedEntry?.is_correct === true;
          const isWrong = gradedEntry?.is_correct === false;

          return (
            <div
              key={q.id}
              className={cn(
                "rounded-2xl border bg-white p-5 shadow-xs transition-colors",
                isReviewMode && isWrong
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

                {isReviewMode &&
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
                isReviewMode={isReviewMode}
                gradedEntry={gradedEntry}
              />

              {isReviewMode && q.explanation && (
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
        })}

        {!isReviewMode && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {submission && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewMode(true)}
              >
                Cancel &amp; View Last Review
              </Button>
            )}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Answers &amp; Check Score
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
