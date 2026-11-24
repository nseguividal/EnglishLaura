"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface CohortCategoryPoint {
  category: string;
  label: string;
  averageScore: number;
  submissions: number;
  color: string;
}

export function AdminAnalyticsCharts({
  cohortData,
}: {
  cohortData: CohortCategoryPoint[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Average Score by Skill Category</CardTitle>
        <CardDescription>
          Aggregated performance across all student submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cohortData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            No scored student submissions yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cohortData}
                margin={{ top: 10, right: 16, left: -12, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#475569" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Cohort Avg"]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    borderColor: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="averageScore" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {cohortData.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
