import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildCategoryStepSeries,
  type StepAssignmentWithMeta,
} from "@/lib/analytics";
import { getScoreBadgeVariant } from "@/lib/scoring";
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type Step,
  type Submission,
} from "@/types/database";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryProgressCharts } from "@/components/category-progress-charts";
import {
  StudentAnalyticsCharts,
  type CategoryScorePoint,
  type TimelineScorePoint,
} from "@/components/student-analytics-charts";

interface SubmissionWithAssignment extends Submission {
  assignment: Assignment | null;
}

export default async function StudentAnalyticsPage() {
  const { profile } = await requireAuth();
  if (!profile.selected_level) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const level = profile.selected_level;

  const [{ data: stepsData }, { data: subsData }] = await Promise.all([
    supabase
      .from("steps")
      .select("*")
      .eq("level", level)
      .eq("is_published", true)
      .order("step_number", { ascending: true }),
    supabase
      .from("submissions")
      .select("*, assignment:assignments(*)")
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: true }),
  ]);

  const steps = (stepsData as Step[]) ?? [];
  const stepIds = steps.map((s) => s.id);

  let stepAssignments: StepAssignmentWithMeta[] = [];
  if (stepIds.length > 0) {
    const { data: saData } = await supabase
      .from("step_assignments")
      .select("*, assignment:assignments!inner(id, category, is_published)")
      .in("step_id", stepIds)
      .eq("assignment.is_published", true);
    stepAssignments = (saData as StepAssignmentWithMeta[]) ?? [];
  }

  const allSubs = ((subsData as SubmissionWithAssignment[]) ?? []).filter(
    (s) => s.assignment && s.assignment.level === level
  );
  const scoredSubs = allSubs.filter((s) => s.percentage_score !== null);

  const categoryStepSeries = buildCategoryStepSeries(
    steps,
    stepAssignments,
    allSubs
  );

  // Aggregate by category
  const categoryData: CategoryScorePoint[] = ALL_CATEGORIES.map((cat) => {
    const items = scoredSubs.filter((s) => s.assignment?.category === cat);
    const avg =
      items.length > 0
        ? Math.round(
            items.reduce((sum, item) => sum + Number(item.percentage_score), 0) /
              items.length
          )
        : 0;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      averageScore: avg,
      count: items.length,
      color: CATEGORY_COLORS[cat].hex,
    };
  }).filter((d) => d.count > 0);

  // Timeline
  const timelineData: TimelineScorePoint[] = scoredSubs.map((s) => ({
    date: new Date(s.submitted_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    title: s.assignment?.title ?? "Assignment",
    score: Math.round(Number(s.percentage_score)),
  }));

  const overallAvg =
    scoredSubs.length > 0
      ? Math.round(
          scoredSubs.reduce((acc, s) => acc + Number(s.percentage_score), 0) /
            scoredSubs.length
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>{EXAM_LEVEL_LABELS[level]}</Badge>
            <h1 className="mt-2 text-2xl font-bold text-[#0f2544] sm:text-3xl">
              Performance Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your step-by-step improvement across all 6 Cambridge skills
              and revisit past submissions.
            </p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Submissions
              </p>
              <p className="mt-2 text-3xl font-bold text-[#0f2544]">
                {allSubs.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Overall Average Score
              </p>
              <p className="mt-2 text-3xl font-bold text-[#0f766e]">
                {overallAvg !== null ? `${overallAvg}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Pending Teacher Reviews
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {allSubs.filter((s) => s.status === "PENDING_REVIEW").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 6 Separate Skill Line Charts (Step 1..N vs Score %) */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-[#0f2544]">
            Skill Improvement Across Steps (Reading, Listening, Writing,
            Vocabulary, Grammar, Use of English)
          </h2>
          <CategoryProgressCharts seriesByCategory={categoryStepSeries} />
        </section>

        <StudentAnalyticsCharts
          categoryData={categoryData}
          timelineData={timelineData}
        />

        {/* Recent Submissions Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Completed Assignments &amp; Mistake Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {allSubs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No submissions yet for {EXAM_LEVEL_LABELS[level]}.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {[...allSubs].reverse().map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-[#0f2544]">
                        {sub.assignment?.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sub.assignment
                          ? CATEGORY_LABELS[sub.assignment.category]
                          : ""}{" "}
                        • Submitted{" "}
                        {new Date(sub.submitted_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.status === "PENDING_REVIEW" ? (
                        <Badge variant="warning">
                          <Clock className="h-3 w-3" />
                          Pending Grade
                        </Badge>
                      ) : (
                        <Badge
                          variant={getScoreBadgeVariant(sub.percentage_score)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {sub.percentage_score !== null
                            ? `${Math.round(Number(sub.percentage_score))}%`
                            : "Completed"}
                        </Badge>
                      )}
                      <Link
                        href={`/assignments/${sub.assignment_id}${sub.step_id ? `?stepId=${sub.step_id}` : ""}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f766e] hover:underline"
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
