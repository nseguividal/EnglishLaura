"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  EXAM_LEVEL_LABELS,
  type Assignment,
  type ExamLevel,
  type Step,
  type StepAssignment,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AdminStepsManagerProps {
  initialSteps: Step[];
  initialStepAssignments: StepAssignment[];
  allAssignments: Assignment[];
}

export function AdminStepsManager({
  initialSteps,
  initialStepAssignments,
  allAssignments,
}: AdminStepsManagerProps) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>("B2_FIRST");
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [stepAssignments, setStepAssignments] = useState<StepAssignment[]>(
    initialStepAssignments
  );

  // New step form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline step edit state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Per-step searchable picker state
  const [pickerOpenStepId, setPickerOpenStepId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const levelSteps = steps
    .filter((s) => s.level === selectedLevel)
    .sort((a, b) => a.step_number - b.step_number);

  const levelAssignments = allAssignments.filter(
    (a) => a.level === selectedLevel
  );

  async function handleCreateStep(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    const nextNumber =
      levelSteps.length > 0
        ? Math.max(...levelSteps.map((s) => s.step_number)) + 1
        : 1;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("steps")
      .insert({
        level: selectedLevel,
        step_number: nextNumber,
        title: title.trim(),
        description: description.trim(),
        is_published: true,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setCreating(false);
      return;
    }

    setSteps((prev) => [...prev, data as Step]);
    setTitle("");
    setDescription("");
    setCreating(false);
    router.refresh();
  }

  function startEditingStep(step: Step) {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description ?? "");
    setError(null);
  }

  async function handleSaveStepEdit(stepId: string) {
    if (!editTitle.trim()) {
      setError("Step title cannot be empty.");
      return;
    }
    setBusyId(stepId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("steps")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
      })
      .eq("id", stepId);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              title: editTitle.trim(),
              description: editDescription.trim(),
            }
          : s
      )
    );
    setEditingStepId(null);
    setBusyId(null);
    router.refresh();
  }

  async function handleReorderStep(index: number, direction: -1 | 1) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= levelSteps.length) return;

    const stepA = levelSteps[index];
    const stepB = levelSteps[targetIdx];
    const numA = stepA.step_number;
    const numB = stepB.step_number;

    setBusyId(stepA.id);
    setError(null);
    const supabase = createClient();

    const tempNum = 999999;
    const r1 = await supabase
      .from("steps")
      .update({ step_number: tempNum })
      .eq("id", stepA.id);
    if (r1.error) {
      setError(r1.error.message);
      setBusyId(null);
      return;
    }

    const r2 = await supabase
      .from("steps")
      .update({ step_number: numA })
      .eq("id", stepB.id);
    if (r2.error) {
      await supabase
        .from("steps")
        .update({ step_number: numA })
        .eq("id", stepA.id);
      setError(r2.error.message);
      setBusyId(null);
      return;
    }

    const r3 = await supabase
      .from("steps")
      .update({ step_number: numB })
      .eq("id", stepA.id);
    if (r3.error) {
      setError(r3.error.message);
      setBusyId(null);
      return;
    }

    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === stepA.id) return { ...s, step_number: numB };
        if (s.id === stepB.id) return { ...s, step_number: numA };
        return s;
      })
    );
    setBusyId(null);
    router.refresh();
  }

  async function handleTogglePublish(step: Step) {
    setBusyId(step.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("steps")
      .update({ is_published: !step.is_published })
      .eq("id", step.id);

    if (!updateError) {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, is_published: !s.is_published } : s
        )
      );
      router.refresh();
    }
    setBusyId(null);
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm("Delete this step? Linked assignments remain in the bank.")) {
      return;
    }
    setBusyId(stepId);
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("steps")
      .delete()
      .eq("id", stepId);

    if (!delError) {
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      setStepAssignments((prev) => prev.filter((sa) => sa.step_id !== stepId));
      router.refresh();
    }
    setBusyId(null);
  }

  async function handleLinkAssignment(stepId: string, assignmentId: string) {
    setBusyId(assignmentId);
    setError(null);
    const existingForStep = stepAssignments.filter(
      (sa) => sa.step_id === stepId
    );
    const nextOrder = existingForStep.length;

    const supabase = createClient();
    const { data, error: linkError } = await supabase
      .from("step_assignments")
      .insert({
        step_id: stepId,
        assignment_id: assignmentId,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (linkError) {
      setError(linkError.message);
    } else if (data) {
      setStepAssignments((prev) => [...prev, data as StepAssignment]);
      router.refresh();
    }
    setBusyId(null);
  }

  async function handleUnlinkAssignment(saId: string) {
    setBusyId(saId);
    const supabase = createClient();
    const { error: unlinkError } = await supabase
      .from("step_assignments")
      .delete()
      .eq("id", saId);

    if (!unlinkError) {
      setStepAssignments((prev) => prev.filter((sa) => sa.id !== saId));
      router.refresh();
    }
    setBusyId(null);
  }

  async function handleReorderAssignment(
    stepId: string,
    index: number,
    direction: -1 | 1
  ) {
    const list = stepAssignments
      .filter((sa) => sa.step_id === stepId)
      .sort((a, b) => a.order_index - b.order_index);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const a = list[index];
    const b = list[targetIdx];

    const supabase = createClient();
    await Promise.all([
      supabase
        .from("step_assignments")
        .update({ order_index: targetIdx })
        .eq("id", a.id),
      supabase
        .from("step_assignments")
        .update({ order_index: index })
        .eq("id", b.id),
    ]);

    setStepAssignments((prev) =>
      prev.map((sa) => {
        if (sa.id === a.id) return { ...sa, order_index: targetIdx };
        if (sa.id === b.id) return { ...sa, order_index: index };
        return sa;
      })
    );
    router.refresh();
  }

  const assignmentById = new Map(allAssignments.map((a) => [a.id, a]));
  const stepById = new Map(steps.map((s) => [s.id, s]));

  // Map each assignment_id -> sorted list of step_numbers it is assigned to (in selected level)
  const assignedStepsByAssignment = new Map<string, number[]>();
  for (const sa of stepAssignments) {
    const linkedStep = stepById.get(sa.step_id);
    if (!linkedStep || linkedStep.level !== selectedLevel) continue;
    const nums = assignedStepsByAssignment.get(sa.assignment_id) ?? [];
    if (!nums.includes(linkedStep.step_number)) {
      nums.push(linkedStep.step_number);
      nums.sort((a, b) => a - b);
    }
    assignedStepsByAssignment.set(sa.assignment_id, nums);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2544]">
            Steps &amp; Sequential Path Builder
          </h1>
          <p className="text-sm text-slate-600">
            Create, edit, and reorder weekly modules per Cambridge level, and
            assign reusable exercises via the searchable picker.
          </p>
        </div>

        <Tabs
          value={selectedLevel}
          onValueChange={(v) => setSelectedLevel(v as ExamLevel)}
        >
          <TabsList>
            <TabsTrigger value="B2_FIRST">B2 First</TabsTrigger>
            <TabsTrigger value="C1_ADVANCED">C1 Advanced</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create New Step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Add New Step to {EXAM_LEVEL_LABELS[selectedLevel]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreateStep}
            className="grid gap-4 sm:grid-cols-12"
          >
            <div className="space-y-1.5 sm:col-span-5">
              <Label htmlFor="stepTitle">Step Title</Label>
              <Input
                id="stepTitle"
                required
                placeholder="e.g. Week 4: Narrative Tenses & Story Writing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-5">
              <Label htmlFor="stepDesc">Description (optional)</Label>
              <Textarea
                id="stepDesc"
                rows={1}
                className="min-h-10"
                placeholder="Optional summary (can be left blank)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Step
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Steps List */}
      <div className="space-y-4">
        {levelSteps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              No steps yet for {EXAM_LEVEL_LABELS[selectedLevel]}. Create one
              above.
            </CardContent>
          </Card>
        ) : (
          levelSteps.map((step, stepIndex) => {
            const linked = stepAssignments
              .filter((sa) => sa.step_id === step.id)
              .sort((a, b) => a.order_index - b.order_index);
            const linkedIds = new Set(linked.map((sa) => sa.assignment_id));
            const searchTerm = (pickerSearch[step.id] ?? "").trim().toLowerCase();
            const availableToLink = levelAssignments
              .filter((a) => {
                if (linkedIds.has(a.id)) return false;
                if (!searchTerm) return true;
                return (
                  a.title.toLowerCase().includes(searchTerm) ||
                  CATEGORY_LABELS[a.category]
                    .toLowerCase()
                    .includes(searchTerm) ||
                  a.category.toLowerCase().includes(searchTerm)
                );
              })
              .sort((a, b) => {
                const aAssigned =
                  (assignedStepsByAssignment.get(a.id)?.length ?? 0) > 0
                    ? 1
                    : 0;
                const bAssigned =
                  (assignedStepsByAssignment.get(b.id)?.length ?? 0) > 0
                    ? 1
                    : 0;
                if (aAssigned !== bAssigned) return aAssigned - bAssigned;
                return a.title.localeCompare(b.title);
              });
            const isPickerOpen = pickerOpenStepId === step.id;
            const isEditingThis = editingStepId === step.id;

            return (
              <Card key={step.id}>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge>Step {step.step_number}</Badge>
                        {step.is_published ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="space-y-1.5">
                            <Label htmlFor={`edit-title-${step.id}`}>
                              Step Title
                            </Label>
                            <Input
                              id={`edit-title-${step.id}`}
                              required
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`edit-desc-${step.id}`}>
                              Description (optional — leave empty to hide)
                            </Label>
                            <Textarea
                              id={`edit-desc-${step.id}`}
                              rows={2}
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              placeholder="Optional description..."
                              className="bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="accent"
                              disabled={busyId === step.id}
                              onClick={() => handleSaveStepEdit(step.id)}
                            >
                              {busyId === step.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Save Changes
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStepId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="mt-2">{step.title}</CardTitle>
                          {step.description && (
                            <p className="mt-1 text-sm text-slate-600">
                              {step.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditingThis && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingStep(step)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={stepIndex === 0 || busyId === step.id}
                          onClick={() => handleReorderStep(stepIndex, -1)}
                          title="Move step earlier"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={
                            stepIndex === levelSteps.length - 1 ||
                            busyId === step.id
                          }
                          onClick={() => handleReorderStep(stepIndex, 1)}
                          title="Move step later"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === step.id}
                          onClick={() => handleTogglePublish(step)}
                        >
                          {step.is_published ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Publish
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === step.id}
                          onClick={() => handleDeleteStep(step.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Linked Assignments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Linked Assignments ({linked.length})
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPickerOpenStepId(isPickerOpen ? null : step.id)
                        }
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {isPickerOpen
                          ? "Close Assignment Picker"
                          : "Assign from Bank"}
                      </Button>
                    </div>

                    {linked.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
                        No assignments linked yet. Click &ldquo;Assign from
                        Bank&rdquo; to attach exercises.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                        {linked.map((sa, idx) => {
                          const assignment = assignmentById.get(
                            sa.assignment_id
                          );
                          const catStyle = assignment
                            ? CATEGORY_COLORS[assignment.category]
                            : null;
                          return (
                            <div
                              key={sa.id}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                            >
                              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                {assignment && catStyle && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium",
                                      catStyle.bg,
                                      catStyle.text,
                                      catStyle.border
                                    )}
                                  >
                                    {CATEGORY_LABELS[assignment.category]}
                                  </span>
                                )}
                                <span className="truncate font-medium text-slate-900">
                                  {assignment?.title ?? "Unknown Assignment"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    handleReorderAssignment(step.id, idx, -1)
                                  }
                                  title="Move up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={idx === linked.length - 1}
                                  onClick={() =>
                                    handleReorderAssignment(step.id, idx, 1)
                                  }
                                  title="Move down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busyId === sa.id}
                                  onClick={() => handleUnlinkAssignment(sa.id)}
                                  className="text-slate-500 hover:text-red-600"
                                >
                                  <Unlink className="h-3.5 w-3.5" />
                                  Unassign
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Searchable Assignment Bank Picker */}
                  {isPickerOpen && (
                    <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/30 p-4">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder={`Search ${EXAM_LEVEL_LABELS[selectedLevel]} assignments by title or category...`}
                          value={pickerSearch[step.id] ?? ""}
                          onChange={(e) =>
                            setPickerSearch((prev) => ({
                              ...prev,
                              [step.id]: e.target.value,
                            }))
                          }
                          className="bg-white pl-9"
                        />
                      </div>

                      {availableToLink.length === 0 ? (
                        <p className="py-3 text-center text-xs text-slate-500">
                          No unlinked {EXAM_LEVEL_LABELS[selectedLevel]}{" "}
                          assignments match your search.
                        </p>
                      ) : (
                        <div className="max-h-64 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                          {availableToLink.map((a) => {
                            const catStyle = CATEGORY_COLORS[a.category];
                            const assignedNums =
                              assignedStepsByAssignment.get(a.id) ?? [];
                            const isAssignedElsewhere = assignedNums.length > 0;
                            return (
                              <div
                                key={a.id}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors",
                                  isAssignedElsewhere
                                    ? "bg-slate-100/90 text-slate-500 hover:bg-slate-200/60"
                                    : "bg-white hover:bg-slate-50"
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold",
                                        catStyle.bg,
                                        catStyle.text,
                                        catStyle.border,
                                        isAssignedElsewhere && "opacity-70"
                                      )}
                                    >
                                      {CATEGORY_LABELS[a.category]}
                                    </span>
                                    <span
                                      className={cn(
                                        "truncate font-medium",
                                        isAssignedElsewhere
                                          ? "text-slate-600"
                                          : "text-slate-900"
                                      )}
                                    >
                                      {a.title}
                                    </span>
                                    {isAssignedElsewhere && (
                                      <span className="inline-flex items-center rounded-sm border border-slate-300 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {assignedNums
                                          .map((n) => `Step ${n}`)
                                          .join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    isAssignedElsewhere ? "outline" : "accent"
                                  }
                                  disabled={busyId === a.id}
                                  onClick={() =>
                                    handleLinkAssignment(step.id, a.id)
                                  }
                                >
                                  {busyId === a.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                  )}
                                  Assign
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
