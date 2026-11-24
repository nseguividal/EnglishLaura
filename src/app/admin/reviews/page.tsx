import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Profile, Question, Submission } from "@/types/database";
import {
  AdminReviewQueue,
  type ReviewSubmissionItem,
} from "@/components/admin-review-queue";

export default async function AdminReviewsPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const { data: subsData } = await supabase
    .from("submissions")
    .select(
      "*, student:profiles!submissions_user_id_fkey(*), assignment:assignments(*)"
    )
    .order("submitted_at", { ascending: false });

  const rawSubs =
    (subsData as Array<
      Submission & { student: Profile | null; assignment: Assignment | null }
    >) ?? [];

  const assignmentIds = Array.from(new Set(rawSubs.map((s) => s.assignment_id)));
  let questionsByAssignment = new Map<string, Question[]>();

  if (assignmentIds.length > 0) {
    const { data: qData } = await supabase
      .from("questions")
      .select("*")
      .in("assignment_id", assignmentIds)
      .order("order_index", { ascending: true });

    const map = new Map<string, Question[]>();
    for (const q of (qData as Question[]) ?? []) {
      const list = map.get(q.assignment_id) ?? [];
      list.push(q);
      map.set(q.assignment_id, list);
    }
    questionsByAssignment = map;
  }

  const items: ReviewSubmissionItem[] = rawSubs.map((s) => ({
    ...s,
    questions: questionsByAssignment.get(s.assignment_id) ?? [],
  }));

  return <AdminReviewQueue initialItems={items} adminId={profile.id} />;
}
