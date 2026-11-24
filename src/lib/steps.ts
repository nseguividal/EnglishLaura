import type { Step, StepAssignment, Submission } from "@/types/database";

export type StepUnlockStatus = "COMPLETED" | "CURRENT" | "LOCKED";

export interface StepWithProgress {
  step: Step;
  totalAssignments: number;
  completedAssignments: number;
  progressPercent: number;
  status: StepUnlockStatus;
  assignmentIds: string[];
}

/**
 * Computes sequential step progression for a given level.
 * - Step 1 (index 0) is always unlocked.
 * - Step N remains LOCKED until the student has submitted 100% of assignments
 *   linked to Step N-1 (status COMPLETED, PENDING_REVIEW, or GRADED all count as submitted).
 * - If a prior step has 0 assignments linked, it does not block the next step.
 */
export function computeStepProgression(
  steps: Step[],
  stepAssignments: Pick<StepAssignment, "step_id" | "assignment_id">[],
  submissions: Submission[]
): StepWithProgress[] {
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);
  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignment_id));

  const assignmentsByStep = new Map<string, string[]>();
  for (const sa of stepAssignments) {
    const existing = assignmentsByStep.get(sa.step_id) ?? [];
    existing.push(sa.assignment_id);
    assignmentsByStep.set(sa.step_id, existing);
  }

  const results: StepWithProgress[] = [];
  let previousStepComplete = true;

  for (let i = 0; i < sortedSteps.length; i++) {
    const step = sortedSteps[i];
    const assignmentIds = assignmentsByStep.get(step.id) ?? [];
    const totalAssignments = assignmentIds.length;
    const completedAssignments = assignmentIds.filter((id) =>
      submittedAssignmentIds.has(id)
    ).length;

    const isStepComplete =
      totalAssignments > 0 && completedAssignments === totalAssignments;
    const progressPercent =
      totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;

    let status: StepUnlockStatus;
    if (i > 0 && !previousStepComplete) {
      status = "LOCKED";
    } else if (isStepComplete) {
      status = "COMPLETED";
    } else {
      status = "CURRENT";
    }

    results.push({
      step,
      totalAssignments,
      completedAssignments,
      progressPercent,
      status,
      assignmentIds,
    });

    // Step N+1 unlocks when Step N is 100% complete (or has 0 assignments)
    previousStepComplete =
      previousStepComplete && (totalAssignments === 0 || isStepComplete);
  }

  return results;
}
