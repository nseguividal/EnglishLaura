import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Layers,
  Library,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type Profile,
  type Submission,
} from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AdminAnalyticsCharts,
  type CohortCategoryPoint,
} from "@/components/admin-analytics-charts";

interface SubmissionWithAssignment extends Submission {
  assignment: Assignment | null;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { data: studentsData },
    { count: stepsCount },
    { count: assignmentsCount },
    { data: submissionsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    supabase.from("steps").select("*", { count: "exact", head: true }),
    supabase.from("assignments").select("*", { count: "exact", head: true }),
    supabase.from("submissions").select("*, assignment:assignments(*)"),
  ]);

  const students = (studentsData as Profile[]) ?? [];
  const submissions = (submissionsData as SubmissionWithAssignment[]) ?? [];
  const pendingReviews = submissions.filter(
    (s) => s.status === "PENDING_REVIEW"
  );
  const scoredSubs = submissions.filter((s) => s.percentage_score !== null);

  const cohortData: CohortCategoryPoint[] = ALL_CATEGORIES.map((cat) => {
    const items = scoredSubs.filter((s) => s.assignment?.category === cat);
    const avg =
      items.length > 0
        ? Math.round(
            items.reduce((sum, i) => sum + Number(i.percentage_score), 0) /
              items.length
          )
        : 0;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      averageScore: avg,
      submissions: items.length,
      color: CATEGORY_COLORS[cat].hex,
    };
  }).filter((d) => d.submissions > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Manage Cambridge B2 First &amp; C1 Advanced steps, reusable
            assignments, and student grading.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/steps">Manage Steps</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/admin/assignments/new">+ New Assignment</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Students
              </p>
              <p className="mt-1.5 text-3xl font-bold text-[#0f2544]">
                {students.length}
              </p>
            </div>
            <Users className="h-8 w-8 text-slate-300" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Published Steps
              </p>
              <p className="mt-1.5 text-3xl font-bold text-[#0f2544]">
                {stepsCount ?? 0}
              </p>
            </div>
            <Layers className="h-8 w-8 text-slate-300" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Reusable Bank
              </p>
              <p className="mt-1.5 text-3xl font-bold text-[#0f2544]">
                {assignmentsCount ?? 0}
              </p>
            </div>
            <Library className="h-8 w-8 text-slate-300" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Pending Reviews
              </p>
              <p className="mt-1.5 text-3xl font-bold text-amber-600">
                {pendingReviews.length}
              </p>
            </div>
            <Link
              href="/admin/reviews"
              className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100"
              title="Open Grading Queue"
            >
              <ClipboardCheck className="h-6 w-6" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <AdminAnalyticsCharts cohortData={cohortData} />

      {/* Student Roster */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Enrolled Students</CardTitle>
          {pendingReviews.length > 0 && (
            <Button size="sm" variant="accent" asChild>
              <Link href="/admin/reviews">
                Grade {pendingReviews.length} Pending
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No student accounts registered yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {students.map((student) => {
                const studentSubs = submissions.filter(
                  (s) => s.user_id === student.id
                );
                const studentScored = studentSubs.filter(
                  (s) => s.percentage_score !== null
                );
                const avg =
                  studentScored.length > 0
                    ? Math.round(
                        studentScored.reduce(
                          (acc, s) => acc + Number(s.percentage_score),
                          0
                        ) / studentScored.length
                      )
                    : null;

                return (
                  <div
                    key={student.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-[#0f2544]">
                        {student.full_name || "Unnamed Student"}
                      </p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {student.selected_level
                          ? EXAM_LEVEL_LABELS[student.selected_level]
                          : "No level chosen"}
                      </Badge>
                      <Badge variant="outline">
                        {studentSubs.length} submissions
                      </Badge>
                      {avg !== null && (
                        <Badge variant="success">Avg {avg}%</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
