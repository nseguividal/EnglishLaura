"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, Save, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type Profile,
  type Question,
  type Submission,
  type SubmissionStatus,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ReviewSubmissionItem extends Submission {
  student: Profile | null;
  assignment: Assignment | null;
  questions: Question[];
}

export function AdminReviewQueue({
  initialItems,
  adminId,
}: {
  initialItems: ReviewSubmissionItem[];
  adminId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ReviewSubmissionItem[]>(initialItems);
  const [filter, setFilter] = useState<"PENDING_REVIEW" | "ALL" | SubmissionStatus>(
    initialItems.some((i) => i.status === "PENDING_REVIEW")
      ? "PENDING_REVIEW"
      : "ALL"
  );
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialItems) {
      map[item.id] =
        item.percentage_score !== null ? String(item.percentage_score) : "";
    }
    return map;
  });
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialItems) {
      map[item.id] = item.admin_feedback ?? "";
    }
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = items.filter((item) =>
    filter === "ALL" ? true : item.status === filter
  );

  const pendingCount = items.filter((i) => i.status === "PENDING_REVIEW").length;

  async function handleGrade(itemId: string) {
    setError(null);
    setSavedNoticeId(null);
    const rawScore = scores[itemId]?.trim() ?? "";
    const parsed = Number(rawScore);
    if (rawScore === "" || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError("Please enter a valid percentage score between 0 and 100.");
      return;
    }

    setSavingId(itemId);
    const rounded = Math.round(parsed * 100) / 100;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        status: "GRADED",
        percentage_score: rounded,
        admin_feedback: feedbacks[itemId]?.trim() || null,
        graded_by: adminId,
        graded_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) {
      setError(updateError.message);
      setSavingId(null);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "GRADED",
              percentage_score: rounded,
              admin_feedback: feedbacks[itemId]?.trim() || null,
            }
          : item
      )
    );
    setSavingId(null);
    setSavedNoticeId(itemId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Student Submissions &amp; Grading Inbox
          </h1>
          <p className="text-sm text-slate-600">
            Review completed exercises, grade open-ended writing responses,
            leave written feedback, or override scores.
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) =>
            setFilter(v as "PENDING_REVIEW" | "ALL" | SubmissionStatus)
          }
        >
          <TabsList>
            <TabsTrigger value="PENDING_REVIEW">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="ALL">All ({items.length})</TabsTrigger>
            <TabsTrigger value="GRADED">Graded</TabsTrigger>
            <TabsTrigger value="COMPLETED">Auto-Graded</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No submissions in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredItems.map((item) => {
            const openQuestions = item.questions.filter(
              (q) =>
                q.question_type === "OPEN_ENDED" ||
                q.question_type === "SPEAKING_RECORDING"
            );
            const autoQuestions = item.questions.filter(
              (q) =>
                q.question_type !== "OPEN_ENDED" &&
                q.question_type !== "SPEAKING_RECORDING"
            );

            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.status === "PENDING_REVIEW" ? (
                          <Badge variant="warning">
                            <Clock className="h-3 w-3" />
                            Pending Review
                          </Badge>
                        ) : item.status === "GRADED" ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" />
                            Graded ({item.percentage_score}%)
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed ({item.percentage_score ?? "—"}%)
                          </Badge>
                        )}
                        {item.assignment && (
                          <>
                            <Badge>{EXAM_LEVEL_LABELS[item.assignment.level]}</Badge>
                            <Badge variant="outline">
                              {CATEGORY_LABELS[item.assignment.category]}
                            </Badge>
                          </>
                        )}
                        {item.raw_score_input && (
                          <Badge variant="outline">
                            External input: {item.raw_score_input}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="mt-2">
                        {item.assignment?.title ?? "Assignment"}
                      </CardTitle>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Student:{" "}
                        <span className="font-medium text-slate-700">
                          {item.student?.full_name || item.student?.email}
                        </span>{" "}
                        • Submitted{" "}
                        {new Date(item.submitted_at).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Open-Ended Writing & Speaking Recording Responses */}
                  {openQuestions.map((q) => {
                    const entry = item.answers?.[q.id];
                    const isAudio = q.question_type === "SPEAKING_RECORDING";
                    return (
                      <div
                        key={q.id}
                        className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {isAudio
                              ? "Speaking Audio Recording"
                              : "Open-Ended Writing Response"}
                          </p>
                          {!isAudio && (
                            <Badge variant="outline">
                              {entry?.word_count ?? 0} words
                              {(q.min_words !== null || q.max_words !== null) &&
                                ` (target ${q.min_words ?? 0}–${q.max_words ?? "∞"})`}
                            </Badge>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-xs text-slate-500">
                          {q.prompt}
                        </p>
                        {isAudio ? (
                          entry?.answer ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <audio controls src={entry.answer} className="w-full">
                                Your browser does not support audio playback.
                              </audio>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              (No audio recording submitted)
                            </p>
                          )
                        ) : (
                          <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">
                            {entry?.answer || "(No response entered)"}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Auto-Graded Answers Summary */}
                  {autoQuestions.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Auto-Graded Questions ({autoQuestions.length})
                      </p>
                      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                        {autoQuestions.map((q, idx) => {
                          const entry = item.answers?.[q.id];
                          const ok = entry?.is_correct === true;
                          return (
                            <div
                              key={q.id}
                              className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800">
                                  {idx + 1}. {q.prompt}
                                </p>
                                <p className="mt-0.5 text-slate-600">
                                  Student answer:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {entry?.answer || "(blank)"}
                                  </span>
                                </p>
                              </div>
                              {ok ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grade / Override Score + Written Feedback */}
                  <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-12">
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label htmlFor={`score-${item.id}`}>
                        Final / Override Score (%)
                      </Label>
                      <Input
                        id={`score-${item.id}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        placeholder="e.g. 84"
                        value={scores[item.id] ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-7">
                      <Label htmlFor={`fb-${item.id}`}>Teacher Feedback</Label>
                      <Textarea
                        id={`fb-${item.id}`}
                        rows={2}
                        className="min-h-10"
                        placeholder="Comment on Content, Communicative Achievement, Organisation, and Language..."
                        value={feedbacks[item.id] ?? ""}
                        onChange={(e) =>
                          setFeedbacks((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-1 sm:col-span-2">
                      <Button
                        type="button"
                        variant="accent"
                        className="w-full"
                        disabled={savingId === item.id}
                        onClick={() => handleGrade(item.id)}
                      >
                        {savingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Grade
                      </Button>
                      {savedNoticeId === item.id && (
                        <span className="text-center text-[11px] font-medium text-emerald-700">
                          Saved!
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
