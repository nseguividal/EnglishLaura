import { createClient } from "@/lib/supabase/server";
import type { Assignment, Step, StepAssignment } from "@/types/database";
import { AdminStepsManager } from "@/components/admin-steps-manager";

export default async function AdminStepsPage() {
  const supabase = await createClient();

  const [{ data: steps }, { data: stepAssignments }, { data: assignments }] =
    await Promise.all([
      supabase.from("steps").select("*").order("step_number", { ascending: true }),
      supabase
        .from("step_assignments")
        .select("*")
        .order("order_index", { ascending: true }),
      supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <AdminStepsManager
      initialSteps={(steps as Step[]) ?? []}
      initialStepAssignments={(stepAssignments as StepAssignment[]) ?? []}
      allAssignments={(assignments as Assignment[]) ?? []}
    />
  );
}
