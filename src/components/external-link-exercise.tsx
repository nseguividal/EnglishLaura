"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseExternalScore } from "@/lib/scoring";
import type { Assignment, Submission } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExternalLinkExerciseProps {
  assignment: Assignment;
  userId: string;
  stepId: string | null;
  existingSubmission: Submission | null;
}

export function ExternalLinkExercise({
  assignment,
  userId,
  stepId,
  existingSubmission,
}: ExternalLinkExerciseProps) {
  const router = useRouter();
  const [scoreInput, setScoreInput] = useState(
    existingSubmission?.raw_score_input ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSubmission, setSavedSubmission] = useState<Submission | null>(
    existingSubmission
  );

  const parsedPreview = scoreInput.trim()
    ? parseExternalScore(scoreInput)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseExternalScore(scoreInput);
    if (!parsed.valid || parsed.percentage === null) {
      setError(parsed.error ?? "Please enter a valid score.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error: upsertError } = await supabase
      .from("submissions")
      .upsert(
        {
          user_id: userId,
          assignment_id: assignment.id,
          step_id: stepId,
          status: "COMPLETED",
          raw_score_input: scoreInput.trim(),
          percentage_score: parsed.percentage,
          answers: {},
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,assignment_id" }
      )
      .select()
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSavedSubmission(data as Submission);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Open External Activity</CardTitle>
          <CardDescription>
            Launch the external practice exercise in a new browser tab, complete
            all items, and note your final score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignment.external_url ? (
            <Button variant="default" size="lg" asChild>
              <a
                href={assignment.external_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open External Resource
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-amber-700">
              No external URL configured for this assignment.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">
                Step 2: Record Your Score &amp; Mark Completed
              </CardTitle>
              <CardDescription>
                Enter your score as a percentage (e.g.{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                  85%
                </code>
                ) or a fraction (e.g.{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                  17/20
                </code>
                ).
              </CardDescription>
            </div>
            {savedSubmission && (
              <Badge variant="success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Recorded: {Math.round(Number(savedSubmission.percentage_score))}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="scoreInput">Your Score (required)</Label>
              <Input
                id="scoreInput"
                type="text"
                required
                placeholder="e.g. 85% or 17/20"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
              />
              {parsedPreview && (
                <p
                  className={
                    parsedPreview.valid
                      ? "text-xs font-medium text-emerald-700"
                      : "text-xs text-red-600"
                  }
                >
                  {parsedPreview.valid
                    ? `Normalized score: ${parsedPreview.normalizedDisplay}`
                    : parsedPreview.error}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-4 w-4" />
                {savedSubmission ? "Update Score" : "Mark as Completed"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
