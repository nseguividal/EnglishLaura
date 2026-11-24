"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type AssignmentCategory,
  type ExamLevel,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminAssignmentBankProps {
  initialAssignments: Assignment[];
  linkCounts: Record<string, number>;
}

export function AdminAssignmentBank({
  initialAssignments,
  linkCounts,
}: AdminAssignmentBankProps) {
  const router = useRouter();
  const [assignments, setAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | ExamLevel>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | AssignmentCategory
  >("ALL");

  const filtered = assignments.filter((a) => {
    if (levelFilter !== "ALL" && a.level !== levelFilter) return false;
    if (categoryFilter !== "ALL" && a.category !== categoryFilter) return false;
    if (
      search.trim() &&
      !a.title.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this assignment permanently? It will also be removed from any linked steps."
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (!error) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Reusable Assignment Bank
          </h1>
          <p className="text-sm text-slate-600">
            Create assignments once and link them to one or more weekly steps.
          </p>
        </div>
        <Button variant="accent" asChild>
          <Link href="/admin/assignments/new">
            <Plus className="h-4 w-4" />
            New Assignment
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assignments by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:col-span-3">
          <Select
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value as "ALL" | ExamLevel)
            }
          >
            <option value="ALL">All Levels</option>
            <option value="B2_FIRST">B2 First</option>
            <option value="C1_ADVANCED">C1 Advanced</option>
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "ALL" | AssignmentCategory)
            }
          >
            <option value="ALL">All Categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No assignments match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => {
            const catStyle = CATEGORY_COLORS[a.category];
            const linkedStepCount = linkCounts[a.id] ?? 0;
            return (
              <div
                key={a.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{EXAM_LEVEL_LABELS[a.level]}</Badge>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-medium",
                        catStyle.bg,
                        catStyle.text,
                        catStyle.border
                      )}
                    >
                      {CATEGORY_LABELS[a.category]}
                    </span>
                    <Badge variant="outline">
                      {a.assignment_type === "EXTERNAL_LINK" ? (
                        <>
                          <ExternalLink className="h-3 w-3" />
                          External Link
                        </>
                      ) : (
                        <>
                          <ListChecks className="h-3 w-3" />
                          Interactive
                        </>
                      )}
                    </Badge>
                    <Badge variant="secondary">
                      Linked to {linkedStepCount}{" "}
                      {linkedStepCount === 1 ? "step" : "steps"}
                    </Badge>
                    {!a.is_published && <Badge variant="warning">Draft</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold text-[#0f2544]">
                    {a.title}
                  </h3>
                  {a.instructions && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {a.instructions}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/assignments/${a.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
