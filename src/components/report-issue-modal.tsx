"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bug, CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ReportQuestionOption {
  id: string;
  label: string;
}

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ReportType;
  userId: string;
  assignmentId?: string;
  assignmentTitle?: string;
  questions?: ReportQuestionOption[];
}

const EXERCISE_CATEGORIES = [
  { value: "WRONG_ANSWER", label: "Wrong or alternative answer" },
  { value: "TYPO", label: "Typo or unclear question" },
  { value: "MEDIA_ISSUE", label: "Audio / video / passage problem" },
  { value: "SUGGESTION", label: "Suggestion for this exercise" },
];

const WEBSITE_CATEGORIES = [
  { value: "BUG", label: "Bug / something not working" },
  { value: "LAYOUT", label: "Visual or mobile layout issue" },
  { value: "SUGGESTION", label: "Website improvement suggestion" },
];

export function ReportIssueModal({
  open,
  onOpenChange,
  mode,
  userId,
  assignmentId,
  assignmentTitle,
  questions = [],
}: ReportIssueModalProps) {
  const categories =
    mode === "EXERCISE_ISSUE" ? EXERCISE_CATEGORIES : WEBSITE_CATEGORIES;

  const [category, setCategory] = useState(categories[0].value);
  const [questionId, setQuestionId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose(nextOpen: boolean) {
    if (!nextOpen) {
      setSubmitted(false);
      setError(null);
      setMessage("");
      setQuestionId("");
      setCategory(categories[0].value);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("feedback_reports")
      .insert({
        user_id: userId,
        report_type: mode,
        issue_category: category,
        assignment_id: mode === "EXERCISE_ISSUE" ? assignmentId ?? null : null,
        question_id:
          mode === "EXERCISE_ISSUE" && questionId ? questionId : null,
        page_url:
          typeof window !== "undefined" ? window.location.pathname : null,
        message: message.trim(),
        status: "OPEN",
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <Dialog.Root open={open} onOpenChange={resetAndClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {mode === "EXERCISE_ISSUE" ? (
                <Flag className="h-4 w-4 text-[#0f2544]" />
              ) : (
                <Bug className="h-4 w-4 text-[#0f2544]" />
              )}
              <Dialog.Title className="text-base font-bold text-[#0f2544]">
                {mode === "EXERCISE_ISSUE"
                  ? "Report an Exercise Issue"
                  : "Report a Website Bug"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-1 text-xs text-slate-500">
            {mode === "EXERCISE_ISSUE"
              ? assignmentTitle
                ? `Flag a wrong answer, typo, or suggestion for "${assignmentTitle}".`
                : "Flag a wrong answer, typo, or suggestion for this exercise."
              : "Let us know if something isn't working properly or if you have a suggestion."}
          </Dialog.Description>

          {submitted ? (
            <div className="mt-5 space-y-4 rounded-xl border border-[#3E6B52]/30 bg-[#3E6B52]/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-[#3E6B52]" />
              <div>
                <p className="text-sm font-semibold text-[#0f2544]">
                  Thank you, report sent!
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Getting your feedback helps us improve the user experience, so
                  we will review it as quick as possible!
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resetAndClose(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reportCategory" className="text-xs">
                  Category
                </Label>
                <Select
                  id="reportCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>

              {mode === "EXERCISE_ISSUE" && questions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="reportQuestion" className="text-xs">
                    Which question? (optional)
                  </Label>
                  <Select
                    id="reportQuestion"
                    value={questionId}
                    onChange={(e) => setQuestionId(e.target.value)}
                  >
                    <option value="">General / whole exercise</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reportMessage" className="text-xs">
                  Details
                </Label>
                <Textarea
                  id="reportMessage"
                  rows={4}
                  required
                  placeholder={
                    mode === "EXERCISE_ISSUE"
                      ? "e.g. In Question 3, 'hadn't booked' should also be accepted..."
                      : "Describe what happened and what you expected..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetAndClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={submitting || !message.trim()}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send Report
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
