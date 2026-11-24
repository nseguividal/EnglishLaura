"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface CategoryScorePoint {
  category: string;
  label: string;
  averageScore: number;
  count: number;
  color: string;
}

export interface TimelineScorePoint {
  date: string;
  title: string;
  score: number;
}

interface StudentAnalyticsChartsProps {
  categoryData: CategoryScorePoint[];
  timelineData: TimelineScorePoint[];
}

export function StudentAnalyticsCharts({
  categoryData,
  timelineData,
}: StudentAnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Performance by Skill Category</CardTitle>
          <CardDescription>
            Average percentage score across Cambridge exam skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              Complete scored assignments to unlock skill analytics.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Avg Score"]}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      borderColor: "#e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="averageScore" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score Progression Over Time</CardTitle>
          <CardDescription>
            Your recent scored exercises in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              Your score timeline will appear once you submit exercises.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 16, left: -12, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#475569" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Score"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.title ?? ""
                    }
                    contentStyle={{
                      borderRadius: "0.75rem",
                      borderColor: "#e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
