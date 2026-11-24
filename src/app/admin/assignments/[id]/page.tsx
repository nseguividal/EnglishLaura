import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Question } from "@/types/database";
import { AdminAssignmentEditor } from "@/components/admin-assignment-editor";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: assignment }, { data: questions }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", id).single(),
    supabase
      .from("questions")
      .select("*")
      .eq("assignment_id", id)
      .order("order_index", { ascending: true }),
  ]);

  if (!assignment) {
    notFound();
  }

  return (
    <AdminAssignmentEditor
      initialAssignment={assignment as Assignment}
      initialQuestions={(questions as Question[]) ?? []}
    />
  );
}
