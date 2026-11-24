import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "@/types/database";
import { AdminAssignmentBank } from "@/components/admin-assignment-bank";

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();

  const [{ data: assignmentsData }, { data: saData }] = await Promise.all([
    supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("step_assignments").select("assignment_id"),
  ]);

  const linkCounts: Record<string, number> = {};
  for (const row of saData ?? []) {
    const id = (row as { assignment_id: string }).assignment_id;
    linkCounts[id] = (linkCounts[id] ?? 0) + 1;
  }

  return (
    <AdminAssignmentBank
      initialAssignments={(assignmentsData as Assignment[]) ?? []}
      linkCounts={linkCounts}
    />
  );
}
