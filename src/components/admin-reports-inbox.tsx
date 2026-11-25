"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bug,
  CheckCircle2,
  ExternalLink,
  Flag,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Assignment,
  FeedbackReport,
  Profile,
  Question,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ReportWithContext extends FeedbackReport {
  student: Profile | null;
  assignment: Pick<Assignment, "id" | "title" | "level" | "category"> | null;
  question: Pick<Question, "id" | "prompt" | "order_index"> | null;
}

const CATEGORY_TEXT: Record<string, string> = {
  WRONG_ANSWER: "Wrong / Alternative Answer",
  TYPO: "Typo / Unclear Question",
  MEDIA_ISSUE: "Audio / Video Problem",
  SUGGESTION: "Suggestion",
  BUG: "Website Bug",
  LAYOUT: "Visual / Layout Issue",
};

export function AdminReportsInbox({
  initialReports,
}: {
  initialReports: ReportWithContext[];
}) {
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithContext[]>(initialReports);
  const [filter, setFilter] = useState<
    "OPEN" | "EXERCISE_ISSUE" | "WEBSITE_BUG" | "RESOLVED" | "ALL"
  >("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCount = reports.filter((r) => r.status === "OPEN").length;

  const filtered = reports.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return r.status === "OPEN";
    if (filter === "RESOLVED") return r.status === "RESOLVED";
    return r.report_type === filter;
  });

  async function toggleStatus(report: ReportWithContext) {
    setBusyId(report.id);
    const nextStatus = report.status === "OPEN" ? "RESOLVED" : "OPEN";
    const supabase = createClient();
    const { error } = await supabase
      .from("feedback_reports")
      .update({
        status: nextStatus,
        resolved_at: nextStatus === "RESOLVED" ? new Date().toISOString() : null,
      })
      .eq("id", report.id);

    if (!error) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: nextStatus } : r
        )
      );
      router.refresh();
    }
    setBusyId(null);
  }

  async function handleDelete(reportId: string) {
    if (!confirm("Delete this report permanently?")) return;
    setBusyId(reportId);
    const supabase = createClient();
    const { error } = await supabase
      .from("feedback_reports")
      .delete()
      .eq("id", reportId);
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      router.refresh();
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Student Reports &amp; Bug Inbox
          </h1>
          <p className="text-sm text-slate-600">
            Review exercise issues (wrong answers, typos) and website bug
            reports submitted by students.
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) =>
            setFilter(
              v as "OPEN" | "EXERCISE_ISSUE" | "WEBSITE_BUG" | "RESOLVED" | "ALL"
            )
          }
        >
          <TabsList>
            <TabsTrigger value="OPEN">Open ({openCount})</TabsTrigger>
            <TabsTrigger value="EXERCISE_ISSUE">Exercises</TabsTrigger>
            <TabsTrigger value="WEBSITE_BUG">Website Bugs</TabsTrigger>
            <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
            <TabsTrigger value="ALL">All ({reports.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No reports in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => {
            const isExercise = report.report_type === "EXERCISE_ISSUE";
            const isOpen = report.status === "OPEN";

            return (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isOpen ? (
                          <Badge variant="warning">Open</Badge>
                        ) : (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" />
                            Resolved
                          </Badge>
                        )}
                        <Badge variant={isExercise ? "default" : "secondary"}>
                          {isExercise ? (
                            <>
                              <Flag className="h-3 w-3" />
                              Exercise Issue
                            </>
                          ) : (
                            <>
                              <Bug className="h-3 w-3" />
                              Website Bug
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline">
                          {CATEGORY_TEXT[report.issue_category] ??
                            report.issue_category}
                        </Badge>
                      </div>

                      <CardTitle className="mt-2 text-base">
                        {isExercise && report.assignment
                          ? report.assignment.title
                          : report.page_url || "General Website Report"}
                      </CardTitle>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Reported by{" "}
                        <span className="font-medium text-slate-700">
                          {report.student?.full_name || report.student?.email}
                        </span>{" "}
                        • {new Date(report.created_at).toLocaleString("en-GB")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isExercise && report.assignment && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/admin/assignments/${report.assignment.id}`}
                          >
                            Edit Assignment
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant={isOpen ? "accent" : "outline"}
                        disabled={busyId === report.id}
                        onClick={() => toggleStatus(report)}
                      >
                        {busyId === report.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isOpen ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {isOpen ? "Mark Resolved" : "Reopen"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busyId === report.id}
                        onClick={() => handleDelete(report.id)}
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {report.question && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
                      <span className="font-semibold text-[#0f2544]">
                        Question #{report.question.order_index + 1}:{" "}
                      </span>
                      {report.question.prompt}
                    </div>
                  )}
                  <p className="whitespace-pre-line rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-slate-800">
                    {report.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
