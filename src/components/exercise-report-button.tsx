"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import {
  ReportIssueModal,
  type ReportQuestionOption,
} from "@/components/report-issue-modal";

interface ExerciseReportButtonProps {
  userId: string;
  assignmentId: string;
  assignmentTitle: string;
  questions: ReportQuestionOption[];
}

export function ExerciseReportButton({
  userId,
  assignmentId,
  assignmentTitle,
  questions,
}: ExerciseReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="Report a wrong answer, typo, or suggestion for this exercise"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>Report issue</span>
      </button>

      <ReportIssueModal
        open={open}
        onOpenChange={setOpen}
        mode="EXERCISE_ISSUE"
        userId={userId}
        assignmentId={assignmentId}
        assignmentTitle={assignmentTitle}
        questions={questions}
      />
    </>
  );
}
