import type {
  Assignment,
  Step,
  StepAssignment,
  Submission,
} from "@/types/database";
import { ALL_CATEGORIES } from "@/types/database";
import type { CategoryChartSeries } from "@/components/category-progress-charts";

export interface StepAssignmentWithMeta
  extends Omit<StepAssignment, "assignment"> {
  assignment?: Pick<Assignment, "id" | "category" | "is_published">;
}

/**
 * Builds the 6 per-category series plotting Step 1, Step 2, Step 3... on the X-axis
 * and the student's average percentage score (0-100) for that category in each step on the Y-axis.
 */
export function buildCategoryStepSeries(
  steps: Step[],
  stepAssignments: StepAssignmentWithMeta[],
  submissions: Submission[]
): CategoryChartSeries {
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);
  const submissionByAssignment = new Map<string, Submission>();
  for (const sub of submissions) {
    submissionByAssignment.set(sub.assignment_id, sub);
  }

  const series = {} as CategoryChartSeries;

  for (const category of ALL_CATEGORIES) {
    series[category] = sortedSteps.map((step) => {
      const linkedInCategory = stepAssignments.filter(
        (sa) => sa.step_id === step.id && sa.assignment?.category === category
      );

      const scores: number[] = [];
      for (const sa of linkedInCategory) {
        const sub = submissionByAssignment.get(sa.assignment_id);
        if (sub && sub.percentage_score !== null) {
          scores.push(Number(sub.percentage_score));
        }
      }

      const avg =
        scores.length > 0
          ? Math.round(
              (scores.reduce((sum, v) => sum + v, 0) / scores.length) * 10
            ) / 10
          : null;

      return {
        stepLabel: `Step ${step.step_number}`,
        stepTitle: step.title,
        score: avg,
        completedCount: scores.length,
      };
    });
  }

  return series;
}
