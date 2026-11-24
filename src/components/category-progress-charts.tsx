"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type AssignmentCategory,
} from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StepCategoryPoint {
  stepLabel: string;
  stepTitle: string;
  score: number | null;
  completedCount: number;
}

export type CategoryChartSeries = Record<AssignmentCategory, StepCategoryPoint[]>;

interface CategoryProgressChartsProps {
  seriesByCategory: CategoryChartSeries;
}

const CHART_ORDER: AssignmentCategory[] = [
  "READING",
  "LISTENING",
  "WRITING",
  "VOCABULARY",
  "GRAMMAR",
  "USE_OF_ENGLISH",
];

export function CategoryProgressCharts({
  seriesByCategory,
}: CategoryProgressChartsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {CHART_ORDER.filter((c) => ALL_CATEGORIES.includes(c)).map((category) => {
        const data = seriesByCategory[category] ?? [];
        const style = CATEGORY_COLORS[category];
        const scoredPoints = data.filter((d) => d.score !== null);
        const latestScore =
          scoredPoints.length > 0
            ? scoredPoints[scoredPoints.length - 1].score
            : null;

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold text-[#0f2544]">
                  {CATEGORY_LABELS[category]}
                </CardTitle>
                <span
                  className={cn(
                    "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold",
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  {latestScore !== null ? `Latest: ${latestScore}%` : "No scores yet"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {data.length === 0 ? (
                <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-400">
                  No steps published yet
                </div>
              ) : (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data}
                      margin={{ top: 8, right: 12, left: -20, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="stepLabel"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(value: number | string) => [
                          `${value}%`,
                          CATEGORY_LABELS[category],
                        ]}
                        labelFormatter={(label, payload) => {
                          const title = payload?.[0]?.payload?.stepTitle;
                          return title ? `${label}: ${title}` : String(label);
                        }}
                        contentStyle={{
                          borderRadius: "0.75rem",
                          borderColor: "#e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={style.hex}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: style.hex, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
