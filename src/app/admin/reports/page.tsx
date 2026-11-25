import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AdminReportsInbox,
  type ReportWithContext,
} from "@/components/admin-reports-inbox";

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("feedback_reports")
    .select(
      "*, student:profiles!feedback_reports_user_id_fkey(*), assignment:assignments(id, title, level, category), question:questions(id, prompt, order_index)"
    )
    .order("created_at", { ascending: false });

  return (
    <AdminReportsInbox
      initialReports={(data as ReportWithContext[]) ?? []}
    />
  );
}
