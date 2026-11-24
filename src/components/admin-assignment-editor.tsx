"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  FileJson,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseAssignmentImportJson } from "@/lib/assignment-import";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  QUESTION_TYPE_LABELS,
  type Assignment,
  type AssignmentCategory,
  type AssignmentPhase,
  type AssignmentType,
  type ExamLevel,
  type MediaType,
  type Question,
  type QuestionData,
  type QuestionType,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_QUESTION_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "FILL_IN_THE_BLANK",
  "KEY_WORD_TRANSFORMATION",
  "TRUE_FALSE_NOT_GIVEN",
  "MATCHING",
  "GAPPED_TEXT",
  "INLINE_CLOZE",
  "WORD_BANK_CLOZE",
  "CATEGORIZE",
  "SENTENCE_ORDERING",
  "ERROR_CORRECTION",
  "OPEN_ENDED",
  "SPEAKING_RECORDING",
];

interface EditableQuestion {
  tempId: string;
  phase_id: string;
  question_type: QuestionType;
  prompt: string;
  image_url: string;
  options: string[];
  correct_answer: string;
  accepted_answers_text: string;
  keyword: string;
  min_words: string;
  max_words: string;
  // Simple structured fields for SENTENCE_ORDERING & ERROR_CORRECTION
  segments_text: string;
  error_sentence: string;
  error_text: string;
  error_corrections_text: string;
  // JSON editor for complex multi-item types (MATCHING, GAPPED_TEXT, INLINE_CLOZE, WORD_BANK_CLOZE)
  question_data_json: string;
  explanation: string;
}

interface AdminAssignmentEditorProps {
  initialAssignment?: Assignment | null;
  initialQuestions?: Question[];
}

function defaultQuestionDataFor(type: QuestionType): QuestionData {
  switch (type) {
    case "MATCHING":
      return {
        pairs: [
          { id: "p1", prompt: "Statement or word 1", match: "Paragraph A" },
          { id: "p2", prompt: "Statement or word 2", match: "Paragraph B" },
        ],
        distractors: ["Paragraph C"],
      };
    case "GAPPED_TEXT":
      return {
        passages: [
          { label: "A", text: "Removed paragraph or sentence A..." },
          { label: "B", text: "Removed paragraph or sentence B..." },
          { label: "C", text: "Distractor paragraph C..." },
        ],
        gapped_gaps: [
          { id: "1", correct_label: "A" },
          { id: "2", correct_label: "B" },
        ],
      };
    case "INLINE_CLOZE":
      return {
        text: "She {{1}} a quick decision and {{2}} home.",
        inline_gaps: [
          {
            id: "1",
            options: ["made", "did", "took", "had"],
            correct_answer: "made",
          },
          {
            id: "2",
            options: ["went", "arrived", "reached", "visited"],
            correct_answer: "went",
          },
        ],
      };
    case "WORD_BANK_CLOZE":
      return {
        text: "The hotel was {{1}} located and {{2}} priced.",
        word_bank: ["conveniently", "reasonably", "hardly"],
        word_bank_gaps: [
          { id: "1", correct_answer: "conveniently" },
          { id: "2", correct_answer: "reasonably" },
        ],
      };
    case "KEY_WORD_TRANSFORMATION":
      return {
        original_sentence: "I regret not booking the train tickets earlier.",
        keyword: "WISH",
        prefix_text: "I",
        suffix_text: "the train tickets earlier.",
        min_words: 2,
        max_words: 5,
        accepted_answers: ["wish I had booked", "wish I'd booked"],
        half_credit_parts: ["wish I", "had booked"],
      };
    case "MULTIPLE_SELECT":
      return {
        correct_answers: ["Option A", "Option C"],
        required_count: 2,
      };
    case "CATEGORIZE":
      return {
        categories: ["Formal", "Informal"],
        items: [
          { id: "i1", text: "Furthermore", correct_category: "Formal" },
          { id: "i2", text: "Plus / Anyway", correct_category: "Informal" },
          { id: "i3", text: "Nevertheless", correct_category: "Formal" },
        ],
      };
    case "SPEAKING_RECORDING":
      return {
        min_seconds: 30,
        max_seconds: 90,
      };
    default:
      return {};
  }
}

function makeEmptyQuestion(
  type: QuestionType = "MULTIPLE_CHOICE",
  phaseId = ""
): EditableQuestion {
  const defaultData = defaultQuestionDataFor(type);
  return {
    tempId: crypto.randomUUID(),
    phase_id: phaseId,
    question_type: type,
    prompt: "",
    image_url: "",
    options: ["", "", "", ""],
    correct_answer: type === "TRUE_FALSE_NOT_GIVEN" ? "TRUE" : "",
    accepted_answers_text: "",
    keyword: "",
    min_words: type === "OPEN_ENDED" ? "140" : "",
    max_words: type === "OPEN_ENDED" ? "190" : "",
    segments_text:
      type === "SENTENCE_ORDERING"
        ? "Not only\ndid she\npass the exam,\nbut she also\nwon a prize."
        : "",
    error_sentence: "",
    error_text: "",
    error_corrections_text: "",
    question_data_json:
      Object.keys(defaultData).length > 0
        ? JSON.stringify(defaultData, null, 2)
        : "{}",
    explanation: "",
  };
}

function isComplexJsonType(type: QuestionType): boolean {
  return (
    type === "MATCHING" ||
    type === "GAPPED_TEXT" ||
    type === "INLINE_CLOZE" ||
    type === "WORD_BANK_CLOZE" ||
    type === "KEY_WORD_TRANSFORMATION" ||
    type === "CATEGORIZE" ||
    type === "SPEAKING_RECORDING"
  );
}

export function AdminAssignmentEditor({
  initialAssignment,
  initialQuestions = [],
}: AdminAssignmentEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAssignment);

  const [activeTab, setActiveTab] = useState<"manual" | "json">("manual");
  const [newQuestionType, setNewQuestionType] =
    useState<QuestionType>("MULTIPLE_CHOICE");

  const [title, setTitle] = useState(initialAssignment?.title ?? "");
  const [instructions, setInstructions] = useState(
    initialAssignment?.instructions ?? ""
  );
  const [level, setLevel] = useState<ExamLevel>(
    initialAssignment?.level ?? "B2_FIRST"
  );
  const [category, setCategory] = useState<AssignmentCategory>(
    initialAssignment?.category ?? "READING"
  );
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(
    initialAssignment?.assignment_type ?? "INTERACTIVE_EXERCISE"
  );
  const [externalUrl, setExternalUrl] = useState(
    initialAssignment?.external_url ?? ""
  );
  const [mediaType, setMediaType] = useState<MediaType>(
    initialAssignment?.media_type ?? "NONE"
  );
  const [mediaContent, setMediaContent] = useState(
    initialAssignment?.media_content ?? ""
  );
  const [mediaStartTime, setMediaStartTime] = useState(
    initialAssignment?.media_start_time ?? ""
  );
  const [mediaEndTime, setMediaEndTime] = useState(
    initialAssignment?.media_end_time ?? ""
  );
  const [mediaAudioOnly, setMediaAudioOnly] = useState(
    Boolean(initialAssignment?.media_audio_only)
  );
  const [phases, setPhases] = useState<AssignmentPhase[]>(
    Array.isArray(initialAssignment?.phases) ? initialAssignment.phases : []
  );
  const [isPublished, setIsPublished] = useState(
    initialAssignment?.is_published ?? true
  );

  const [questions, setQuestions] = useState<EditableQuestion[]>(() =>
    initialQuestions.map((q) => {
      const qData = q.question_data ?? {};
      return {
        tempId: q.id,
        phase_id: qData.phase_id ?? "",
        question_type: q.question_type,
        prompt: q.prompt,
        image_url: q.image_url ?? "",
        options:
          q.options && q.options.length > 0 ? [...q.options] : ["", "", "", ""],
        correct_answer: q.correct_answer ?? "",
        accepted_answers_text: (q.accepted_answers ?? []).join(", "),
        keyword: q.keyword ?? "",
        min_words: q.min_words !== null ? String(q.min_words) : "",
        max_words: q.max_words !== null ? String(q.max_words) : "",
        segments_text: (qData.segments ?? []).join("\n"),
        error_sentence: qData.sentence ?? "",
        error_text: qData.error_text ?? "",
        error_corrections_text: (qData.accepted_corrections ?? []).join(", "),
        question_data_json: JSON.stringify(qData, null, 2),
        explanation: q.explanation ?? "",
      };
    })
  );

  // JSON Bulk Import state
  const [jsonInput, setJsonInput] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [importingJson, setImportingJson] = useState(false);

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingQuestionImgId, setUploadingQuestionImgId] = useState<
    string | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopyJsonTemplate() {
    setError(null);
    try {
      const res = await fetch("/templates/assignment-import-template.json");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2500);
    } catch {
      setError(
        "Could not copy template automatically. Use the 'View Template File' link instead."
      );
    }
  }

  function handleLoadJsonIntoForm() {
    setError(null);
    const result = parseAssignmentImportJson(jsonInput);
    if (!result.valid || !result.data) {
      setError(result.error ?? "Invalid JSON payload.");
      return;
    }

    const d = result.data;
    setTitle(d.title);
    setInstructions(d.instructions);
    setLevel(d.level);
    setCategory(d.category);
    setAssignmentType(d.assignment_type);
    setExternalUrl(d.external_url ?? "");
    setMediaType(d.media_type);
    setMediaContent(d.media_content ?? "");
    setMediaStartTime(d.media_start_time ?? "");
    setMediaEndTime(d.media_end_time ?? "");
    setMediaAudioOnly(Boolean(d.media_audio_only));
    setPhases(d.phases ?? []);
    setIsPublished(d.is_published);
    setQuestions(
      d.questions.map((q) => {
        const qData = q.question_data ?? {};
        return {
          tempId: crypto.randomUUID(),
          phase_id: qData.phase_id ?? "",
          question_type: q.question_type,
          prompt: q.prompt,
          image_url: q.image_url ?? "",
          options:
            q.options && q.options.length > 0 ? q.options : ["", "", "", ""],
          correct_answer: q.correct_answer ?? "",
          accepted_answers_text: (q.accepted_answers ?? []).join(", "),
          keyword: q.keyword ?? "",
          min_words:
            q.min_words !== null && q.min_words !== undefined
              ? String(q.min_words)
              : "",
          max_words:
            q.max_words !== null && q.max_words !== undefined
              ? String(q.max_words)
              : "",
          segments_text: (qData.segments ?? []).join("\n"),
          error_sentence: qData.sentence ?? "",
          error_text: qData.error_text ?? "",
          error_corrections_text: (qData.accepted_corrections ?? []).join(", "),
          question_data_json: JSON.stringify(qData, null, 2),
          explanation: q.explanation ?? "",
        };
      })
    );
    setActiveTab("manual");
  }

  async function handleInstantJsonImport() {
    setError(null);
    const result = parseAssignmentImportJson(jsonInput);
    if (!result.valid || !result.data) {
      setError(result.error ?? "Invalid JSON payload.");
      return;
    }

    setImportingJson(true);
    const d = result.data;
    const supabase = createClient();

    const { data: inserted, error: insertError } = await supabase
      .from("assignments")
      .insert({
        title: d.title,
        instructions: d.instructions,
        level: d.level,
        category: d.category,
        assignment_type: d.assignment_type,
        external_url:
          d.assignment_type === "EXTERNAL_LINK" ? d.external_url : null,
        media_type: d.media_type,
        media_content: d.media_type !== "NONE" ? d.media_content : null,
        media_start_time: d.media_start_time,
        media_end_time: d.media_end_time,
        media_audio_only: d.media_audio_only,
        phases: d.phases,
        is_published: d.is_published,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      setError(insertError?.message ?? "Failed to create assignment from JSON.");
      setImportingJson(false);
      return;
    }

    const assignmentId = (inserted as Assignment).id;

    if (d.assignment_type === "INTERACTIVE_EXERCISE" && d.questions.length > 0) {
      const rows = d.questions.map((q, idx) => ({
        assignment_id: assignmentId,
        order_index: idx,
        question_type: q.question_type,
        prompt: q.prompt,
        image_url: q.image_url ?? null,
        options:
          q.question_type === "MULTIPLE_CHOICE" ||
          q.question_type === "MULTIPLE_SELECT"
            ? q.options ?? []
            : [],
        correct_answer:
          q.question_type === "MULTIPLE_CHOICE"
            ? q.correct_answer || q.options?.[0] || null
            : q.question_type === "TRUE_FALSE_NOT_GIVEN"
              ? q.correct_answer ?? "TRUE"
              : null,
        accepted_answers:
          q.question_type === "FILL_IN_THE_BLANK"
            ? q.accepted_answers ?? []
            : [],
        keyword:
          q.question_type === "FILL_IN_THE_BLANK" ? q.keyword ?? null : null,
        min_words: q.question_type === "OPEN_ENDED" ? q.min_words ?? null : null,
        max_words: q.question_type === "OPEN_ENDED" ? q.max_words ?? null : null,
        question_data: q.question_data ?? {},
        explanation: q.explanation ?? null,
      }));

      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) {
        setError(
          `Assignment created, but failed to insert questions: ${qErr.message}`
        );
        setImportingJson(false);
        return;
      }
    }

    router.push("/admin/assignments");
    router.refresh();
  }

  async function uploadToStorage(file: File): Promise<string | null> {
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("assignment-media")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      return null;
    }
    const { data } = supabase.storage
      .from("assignment-media")
      .getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setError(null);
    const url = await uploadToStorage(file);
    if (url) setMediaContent(url);
    setUploadingMedia(false);
  }

  async function handleQuestionImageUpload(
    tempId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQuestionImgId(tempId);
    setError(null);
    const url = await uploadToStorage(file);
    if (url) {
      updateQuestion(tempId, (curr) => ({ ...curr, image_url: url }));
    }
    setUploadingQuestionImgId(null);
  }

  function updateQuestion(
    tempId: string,
    updater: (q: EditableQuestion) => EditableQuestion
  ) {
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === tempId ? updater(q) : q))
    );
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setQuestions(copy);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Pre-validate complex JSON configs before touching DB
    const builtQuestionData: QuestionData[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (isComplexJsonType(q.question_type)) {
        try {
          builtQuestionData.push(
            JSON.parse(q.question_data_json || "{}") as QuestionData
          );
        } catch {
          setError(
            `Question #${i + 1} (${QUESTION_TYPE_LABELS[q.question_type]}) has invalid JSON in its configuration.`
          );
          setSaving(false);
          return;
        }
      } else if (q.question_type === "SENTENCE_ORDERING") {
        const segments = q.segments_text
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        builtQuestionData.push({ segments });
      } else if (q.question_type === "ERROR_CORRECTION") {
        const accepted_corrections = q.error_corrections_text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        builtQuestionData.push({
          sentence: q.error_sentence.trim(),
          error_text: q.error_text.trim() || undefined,
          accepted_corrections,
        });
      } else if (q.question_type === "MULTIPLE_SELECT") {
        try {
          const parsed = JSON.parse(q.question_data_json || "{}") as QuestionData;
          builtQuestionData.push(parsed);
        } catch {
          builtQuestionData.push({ correct_answers: [] });
        }
      } else {
        builtQuestionData.push({});
      }
    }

    const supabase = createClient();
    const payload = {
      title: title.trim(),
      instructions: instructions.trim(),
      level,
      category,
      assignment_type: assignmentType,
      external_url:
        assignmentType === "EXTERNAL_LINK" ? externalUrl.trim() || null : null,
      media_type: mediaType,
      media_content: mediaType !== "NONE" ? mediaContent.trim() || null : null,
      media_start_time:
        mediaType === "VIDEO_URL" || mediaType === "AUDIO_MP4_UPLOAD"
          ? mediaStartTime.trim() || null
          : null,
      media_end_time:
        mediaType === "VIDEO_URL" || mediaType === "AUDIO_MP4_UPLOAD"
          ? mediaEndTime.trim() || null
          : null,
      media_audio_only: mediaType === "VIDEO_URL" ? mediaAudioOnly : false,
      phases:
        assignmentType === "INTERACTIVE_EXERCISE"
          ? phases.map((ph) => ({
              ...ph,
              title: ph.title.trim() || "Untitled Phase",
              instructions: ph.instructions?.trim() || "",
              media_content: ph.media_content?.trim() || null,
              start_time: ph.start_time?.trim() || null,
              end_time: ph.end_time?.trim() || null,
            }))
          : [],
      is_published: isPublished,
    };

    let assignmentId = initialAssignment?.id ?? "";

    if (isEditing && initialAssignment) {
      const { error: updateError } = await supabase
        .from("assignments")
        .update(payload)
        .eq("id", initialAssignment.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
      assignmentId = initialAssignment.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("assignments")
        .insert(payload)
        .select()
        .single();

      if (insertError || !inserted) {
        setError(insertError?.message ?? "Failed to create assignment.");
        setSaving(false);
        return;
      }
      assignmentId = (inserted as Assignment).id;
    }

    if (assignmentType === "INTERACTIVE_EXERCISE") {
      await supabase
        .from("questions")
        .delete()
        .eq("assignment_id", assignmentId);

      if (questions.length > 0) {
        const questionRows = questions.map((q, idx) => {
          const cleanOptions =
            q.question_type === "MULTIPLE_CHOICE" ||
            q.question_type === "MULTIPLE_SELECT"
              ? q.options.map((o) => o.trim()).filter(Boolean)
              : [];
          const accepted =
            q.question_type === "FILL_IN_THE_BLANK"
              ? q.accepted_answers_text
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];

          return {
            assignment_id: assignmentId,
            order_index: idx,
            question_type: q.question_type,
            prompt: q.prompt.trim(),
            image_url: q.image_url.trim() || null,
            options: cleanOptions,
            correct_answer:
              q.question_type === "MULTIPLE_CHOICE"
                ? q.correct_answer.trim() || cleanOptions[0] || null
                : q.question_type === "TRUE_FALSE_NOT_GIVEN"
                  ? q.correct_answer.trim() || "TRUE"
                  : null,
            accepted_answers: accepted,
            keyword:
              q.question_type === "FILL_IN_THE_BLANK"
                ? q.keyword.trim() || null
                : null,
            min_words:
              q.question_type === "OPEN_ENDED" && q.min_words.trim()
                ? Number(q.min_words)
                : null,
            max_words:
              q.question_type === "OPEN_ENDED" && q.max_words.trim()
                ? Number(q.max_words)
                : null,
            question_data: {
              ...(builtQuestionData[idx] ?? {}),
              ...(phases.length > 0 && q.phase_id
                ? { phase_id: q.phase_id }
                : {}),
            },
            explanation: q.explanation.trim() || null,
          };
        });

        const { error: qError } = await supabase
          .from("questions")
          .insert(questionRows);
        if (qError) {
          setError(qError.message);
          setSaving(false);
          return;
        }
      }
    }

    router.push("/admin/assignments");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Sticky top action bar so Save Assignment is always visible while scrolling */}
      <div className="sticky top-16 z-30 -mx-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div>
          <Link
            href="/admin/assignments"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0f2544]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Assignment Bank
          </Link>
          <h1 className="mt-0.5 text-xl font-bold text-[#0f2544] sm:text-2xl">
            {isEditing ? "Edit Assignment" : "Assignment Builder"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyJsonTemplate}
          >
            {copiedTemplate ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Template Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy JSON Template
              </>
            )}
          </Button>
          {activeTab === "manual" && (
            <Button
              type="submit"
              form="assignment-editor-form"
              variant="accent"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Assignment
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "manual" | "json")}
      >
        <TabsList>
          <TabsTrigger value="manual">Manual Builder</TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="mr-1.5 h-4 w-4" />
            Import from JSON
          </TabsTrigger>
        </TabsList>

        {/* JSON BULK IMPORT TAB */}
        <TabsContent value="json">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    Bulk Import Assignment from JSON (Supports All 14 Question
                    Types)
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    Copy our reference JSON template, feed it to an LLM to
                    generate a new Cambridge B2/C1 exercise, and paste the JSON
                    below.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJsonTemplate}
                  >
                    {copiedTemplate ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy JSON Template
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href="/templates/assignment-import-template.json"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Template File
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {ALL_QUESTION_TYPES.map((qt) => (
                  <Badge key={qt} variant="outline" className="font-mono text-[11px]">
                    {qt}
                  </Badge>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jsonPayload">Assignment JSON Payload</Label>
                <Textarea
                  id="jsonPayload"
                  rows={16}
                  className="font-mono text-xs leading-relaxed"
                  placeholder='Paste valid assignment JSON here (click "Copy JSON Template" above to see all 10 question types)...'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!jsonInput.trim()}
                  onClick={handleLoadJsonIntoForm}
                >
                  Load into Manual Editor
                </Button>
                {!isEditing && (
                  <Button
                    type="button"
                    variant="accent"
                    disabled={!jsonInput.trim() || importingJson}
                    onClick={handleInstantJsonImport}
                  >
                    {importingJson ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Import &amp; Create Assignment Instantly
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANUAL FORM BUILDER TAB */}
        <TabsContent value="manual">
          <form
            id="assignment-editor-form"
            onSubmit={handleSave}
            className="space-y-6"
          >
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    required
                    placeholder="e.g. Reading Part 5: Urban Rooftop Farming"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    rows={3}
                    placeholder="Clear student instructions..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="level">Cambridge Level</Label>
                  <Select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as ExamLevel)}
                  >
                    <option value="B2_FIRST">B2 First</option>
                    <option value="C1_ADVANCED">C1 Advanced</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as AssignmentCategory)
                    }
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assignmentType">Assignment Type</Label>
                  <Select
                    id="assignmentType"
                    value={assignmentType}
                    onChange={(e) =>
                      setAssignmentType(e.target.value as AssignmentType)
                    }
                  >
                    <option value="INTERACTIVE_EXERCISE">
                      Interactive Exercise
                    </option>
                    <option value="EXTERNAL_LINK">External Link</option>
                  </Select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-4 w-4 accent-[#0f766e]"
                    />
                    Published (visible to students)
                  </label>
                </div>

                {assignmentType === "EXTERNAL_LINK" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="externalUrl">External Resource URL</Label>
                    <Input
                      id="externalUrl"
                      type="url"
                      required
                      placeholder="https://www.cambridgeenglish.org/..."
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media / Split-Screen Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Media / Passage Support (Enables Desktop Split-Screen)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-sm space-y-1.5">
                  <Label htmlFor="mediaType">Media Type</Label>
                  <Select
                    id="mediaType"
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as MediaType)}
                  >
                    <option value="NONE">None (Single-column layout)</option>
                    <option value="READING_PASSAGE">
                      Reading Passage (Text)
                    </option>
                    <option value="VIDEO_URL">
                      Video URL (YouTube / Vimeo)
                    </option>
                    <option value="AUDIO_MP4_UPLOAD">
                      Audio / MP4 Upload (Supabase Storage)
                    </option>
                  </Select>
                </div>

                {mediaType === "READING_PASSAGE" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="passageText">Passage Text</Label>
                    <Textarea
                      id="passageText"
                      rows={10}
                      placeholder="Paste the full reading passage here (separate paragraphs with blank lines)..."
                      value={mediaContent}
                      onChange={(e) => setMediaContent(e.target.value)}
                    />
                  </div>
                )}

                {mediaType === "VIDEO_URL" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="videoUrl">YouTube or Vimeo URL</Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={mediaContent}
                        onChange={(e) => setMediaContent(e.target.value)}
                      />
                    </div>
                    <div className="grid max-w-md gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="mediaStart">
                          Start Time (MM:SS, optional)
                        </Label>
                        <Input
                          id="mediaStart"
                          placeholder="e.g. 01:30"
                          value={mediaStartTime}
                          onChange={(e) => setMediaStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mediaEnd">
                          End Time (MM:SS, optional)
                        </Label>
                        <Input
                          id="mediaEnd"
                          placeholder="e.g. 04:15"
                          value={mediaEndTime}
                          onChange={(e) => setMediaEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={mediaAudioOnly}
                        onChange={(e) => setMediaAudioOnly(e.target.checked)}
                        className="h-4 w-4 accent-[#0f766e]"
                      />
                      Audio-Only Mode (hide YouTube video screen, show audio
                      player only)
                    </label>
                  </div>
                )}

                {mediaType === "AUDIO_MP4_UPLOAD" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {uploadingMedia ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload MP3 / MP4 / WAV to Supabase Storage
                        <input
                          type="file"
                          accept="audio/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploadingMedia}
                        />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mediaUrl">Or direct media URL</Label>
                      <Input
                        id="mediaUrl"
                        type="url"
                        placeholder="https://...supabase.co/storage/v1/object/public/assignment-media/..."
                        value={mediaContent}
                        onChange={(e) => setMediaContent(e.target.value)}
                      />
                    </div>
                    <div className="grid max-w-md gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="audioStart">
                          Start Time (MM:SS, optional)
                        </Label>
                        <Input
                          id="audioStart"
                          placeholder="e.g. 00:30"
                          value={mediaStartTime}
                          onChange={(e) => setMediaStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="audioEnd">
                          End Time (MM:SS, optional)
                        </Label>
                        <Input
                          id="audioEnd"
                          placeholder="e.g. 03:45"
                          value={mediaEndTime}
                          onChange={(e) => setMediaEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Multi-Phase Listening / Exam Parts Builder */}
            {assignmentType === "INTERACTIVE_EXERCISE" && (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      Multi-Phase Exam Parts ({phases.length})
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Optional: Split a Listening or Reading exam into phases
                      (Part 1, Part 2, Part 3...). Each phase gets its own video
                      clip (MM:SS to MM:SS) and immediate correction, and the
                      final score is the average of all phases.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPhases((prev) => [
                        ...prev,
                        {
                          id: `phase-${prev.length + 1}-${Date.now().toString(36)}`,
                          title: `Part ${prev.length + 1}`,
                          instructions: "",
                          media_type: "VIDEO_URL",
                          media_content: "",
                          start_time: "",
                          end_time: "",
                        },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Phase
                  </Button>
                </CardHeader>
                {phases.length > 0 && (
                  <CardContent className="space-y-4">
                    {phases.map((ph, idx) => (
                      <div
                        key={ph.id}
                        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge>Phase {idx + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPhases((prev) =>
                                prev.filter((item) => item.id !== ph.id)
                              )
                            }
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Phase Title</Label>
                            <Input
                              value={ph.title}
                              placeholder={`Part ${idx + 1} — Multiple Choice`}
                              className="bg-white"
                              onChange={(e) =>
                                setPhases((prev) =>
                                  prev.map((p) =>
                                    p.id === ph.id
                                      ? { ...p, title: e.target.value }
                                      : p
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phase Media Type</Label>
                            <Select
                              value={ph.media_type}
                              className="bg-white"
                              onChange={(e) =>
                                setPhases((prev) =>
                                  prev.map((p) =>
                                    p.id === ph.id
                                      ? {
                                          ...p,
                                          media_type: e.target
                                            .value as MediaType,
                                        }
                                      : p
                                  )
                                )
                              }
                            >
                              <option value="NONE">None</option>
                              <option value="VIDEO_URL">
                                YouTube / Vimeo Video
                              </option>
                              <option value="AUDIO_MP4_UPLOAD">
                                Audio / MP4 URL
                              </option>
                              <option value="READING_PASSAGE">
                                Reading Passage
                              </option>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">
                              Phase Instructions (optional)
                            </Label>
                            <Input
                              value={ph.instructions ?? ""}
                              placeholder="Listen to the extract and answer questions 1–4..."
                              className="bg-white"
                              onChange={(e) =>
                                setPhases((prev) =>
                                  prev.map((p) =>
                                    p.id === ph.id
                                      ? { ...p, instructions: e.target.value }
                                      : p
                                  )
                                )
                              }
                            />
                          </div>
                          {ph.media_type !== "NONE" && (
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">
                                {ph.media_type === "READING_PASSAGE"
                                  ? "Passage Text"
                                  : "Video / Audio URL"}
                              </Label>
                              {ph.media_type === "READING_PASSAGE" ? (
                                <Textarea
                                  rows={4}
                                  value={ph.media_content ?? ""}
                                  className="bg-white"
                                  onChange={(e) =>
                                    setPhases((prev) =>
                                      prev.map((p) =>
                                        p.id === ph.id
                                          ? {
                                              ...p,
                                              media_content: e.target.value,
                                            }
                                          : p
                                      )
                                    )
                                  }
                                />
                              ) : (
                                <Input
                                  type="url"
                                  value={ph.media_content ?? ""}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="bg-white"
                                  onChange={(e) =>
                                    setPhases((prev) =>
                                      prev.map((p) =>
                                        p.id === ph.id
                                          ? {
                                              ...p,
                                              media_content: e.target.value,
                                            }
                                          : p
                                      )
                                    )
                                  }
                                />
                              )}
                            </div>
                          )}
                          {(ph.media_type === "VIDEO_URL" ||
                            ph.media_type === "AUDIO_MP4_UPLOAD") && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Start Time (MM:SS)
                                </Label>
                                <Input
                                  value={ph.start_time ?? ""}
                                  placeholder="00:30"
                                  className="bg-white"
                                  onChange={(e) =>
                                    setPhases((prev) =>
                                      prev.map((p) =>
                                        p.id === ph.id
                                          ? { ...p, start_time: e.target.value }
                                          : p
                                      )
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  End Time (MM:SS)
                                </Label>
                                <Input
                                  value={ph.end_time ?? ""}
                                  placeholder="04:15"
                                  className="bg-white"
                                  onChange={(e) =>
                                    setPhases((prev) =>
                                      prev.map((p) =>
                                        p.id === ph.id
                                          ? { ...p, end_time: e.target.value }
                                          : p
                                      )
                                    )
                                  }
                                />
                              </div>
                              {ph.media_type === "VIDEO_URL" && (
                                <div className="sm:col-span-2">
                                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(ph.audio_only)}
                                      onChange={(e) =>
                                        setPhases((prev) =>
                                          prev.map((p) =>
                                            p.id === ph.id
                                              ? {
                                                  ...p,
                                                  audio_only: e.target.checked,
                                                }
                                              : p
                                          )
                                        )
                                      }
                                      className="h-3.5 w-3.5 accent-[#0f766e]"
                                    />
                                    Audio-Only Mode (hide video screen, show
                                    audio player only)
                                  </label>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Question Builder */}
            {assignmentType === "INTERACTIVE_EXERCISE" && (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Interactive Questions ({questions.length})
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={newQuestionType}
                      onChange={(e) =>
                        setNewQuestionType(e.target.value as QuestionType)
                      }
                      className="h-9 w-64 text-xs"
                    >
                      {ALL_QUESTION_TYPES.map((qt) => (
                        <option key={qt} value={qt}>
                          {QUESTION_TYPE_LABELS[qt]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={() =>
                        setQuestions((prev) => [
                          ...prev,
                          makeEmptyQuestion(
                            newQuestionType,
                            phases[0]?.id ?? ""
                          ),
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Question
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {questions.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                      Pick a question type above and click &ldquo;Add
                      Question&rdquo;, or switch to the &ldquo;Import from
                      JSON&rdquo; tab.
                    </p>
                  ) : (
                    questions.map((q, idx) => (
                      <div
                        key={q.tempId}
                        className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0f2544] text-xs font-bold text-white">
                              {idx + 1}
                            </span>
                            <Select
                              value={q.question_type}
                              onChange={(e) => {
                                const nextType = e.target.value as QuestionType;
                                const defaults =
                                  defaultQuestionDataFor(nextType);
                                updateQuestion(q.tempId, (curr) => ({
                                  ...curr,
                                  question_type: nextType,
                                  correct_answer:
                                    nextType === "TRUE_FALSE_NOT_GIVEN"
                                      ? "TRUE"
                                      : curr.correct_answer,
                                  question_data_json:
                                    Object.keys(defaults).length > 0
                                      ? JSON.stringify(defaults, null, 2)
                                      : curr.question_data_json,
                                }));
                              }}
                              className="h-8 w-64 text-xs"
                            >
                              {ALL_QUESTION_TYPES.map((qt) => (
                                <option key={qt} value={qt}>
                                  {QUESTION_TYPE_LABELS[qt]}
                                </option>
                              ))}
                            </Select>
                            {phases.length > 0 && (
                              <Select
                                value={q.phase_id || phases[0]?.id || ""}
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    phase_id: e.target.value,
                                  }))
                                }
                                className="h-8 w-44 bg-white text-xs"
                              >
                                {phases.map((ph, pIdx) => (
                                  <option key={ph.id} value={ph.id}>
                                    Phase {pIdx + 1}: {ph.title}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={idx === 0}
                              onClick={() => moveQuestion(idx, -1)}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={idx === questions.length - 1}
                              onClick={() => moveQuestion(idx, 1)}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setQuestions((prev) =>
                                  prev.filter(
                                    (item) => item.tempId !== q.tempId
                                  )
                                )
                              }
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Optional Image for any question (great for Vocabulary / Visual tasks) */}
                        <div className="grid gap-2 sm:grid-cols-12">
                          <div className="space-y-1 sm:col-span-8">
                            <Label className="text-xs">
                              Optional Question Image URL (e.g. Vocabulary
                              picture)
                            </Label>
                            <Input
                              type="url"
                              placeholder="https://... (or upload on the right)"
                              value={q.image_url}
                              onChange={(e) =>
                                updateQuestion(q.tempId, (curr) => ({
                                  ...curr,
                                  image_url: e.target.value,
                                }))
                              }
                              className="h-9 bg-white text-xs"
                            />
                          </div>
                          <div className="flex items-end sm:col-span-4">
                            <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {uploadingQuestionImgId === q.tempId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ImagePlus className="h-3.5 w-3.5" />
                              )}
                              Upload Image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingQuestionImgId === q.tempId}
                                onChange={(e) =>
                                  handleQuestionImageUpload(q.tempId, e)
                                }
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Prompt / Instructions</Label>
                          <Textarea
                            rows={2}
                            required
                            placeholder="Enter question prompt..."
                            value={q.prompt}
                            onChange={(e) =>
                              updateQuestion(q.tempId, (curr) => ({
                                ...curr,
                                prompt: e.target.value,
                              }))
                            }
                            className="bg-white"
                          />
                        </div>

                        {/* MULTIPLE_CHOICE */}
                        {q.question_type === "MULTIPLE_CHOICE" && (
                          <div className="space-y-2">
                            <Label>
                              Options (select radio for correct answer)
                            </Label>
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="radio"
                                  name={`correct-${q.tempId}`}
                                  checked={
                                    q.correct_answer !== "" &&
                                    q.correct_answer === opt
                                  }
                                  onChange={() =>
                                    updateQuestion(q.tempId, (curr) => ({
                                      ...curr,
                                      correct_answer: opt,
                                    }))
                                  }
                                  className="h-4 w-4 accent-[#0f766e]"
                                />
                                <Input
                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  value={opt}
                                  className="bg-white"
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    updateQuestion(q.tempId, (curr) => {
                                      const nextOpts = [...curr.options];
                                      const wasCorrect =
                                        curr.correct_answer ===
                                        nextOpts[optIdx];
                                      nextOpts[optIdx] = newVal;
                                      return {
                                        ...curr,
                                        options: nextOpts,
                                        correct_answer: wasCorrect
                                          ? newVal
                                          : curr.correct_answer,
                                      };
                                    });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MULTIPLE_SELECT */}
                        {q.question_type === "MULTIPLE_SELECT" && (() => {
                          let currentCorrect: string[] = [];
                          try {
                            const parsed = JSON.parse(
                              q.question_data_json || "{}"
                            ) as QuestionData;
                            currentCorrect = parsed.correct_answers ?? [];
                          } catch {
                            currentCorrect = [];
                          }

                          function toggleCorrectOpt(opt: string) {
                            const next = currentCorrect.includes(opt)
                              ? currentCorrect.filter((o) => o !== opt)
                              : [...currentCorrect, opt];
                            updateQuestion(q.tempId, (curr) => ({
                              ...curr,
                              question_data_json: JSON.stringify(
                                {
                                  correct_answers: next,
                                  required_count: next.length || 2,
                                },
                                null,
                                2
                              ),
                            }));
                          }

                          return (
                            <div className="space-y-2">
                              <Label>
                                Options (check ALL correct answers — e.g. 2 or
                                3)
                              </Label>
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      opt !== "" && currentCorrect.includes(opt)
                                    }
                                    onChange={() => toggleCorrectOpt(opt)}
                                    className="h-4 w-4 accent-[#0f766e]"
                                  />
                                  <Input
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    value={opt}
                                    className="bg-white"
                                    onChange={(e) => {
                                      const newVal = e.target.value;
                                      const oldVal = q.options[optIdx];
                                      updateQuestion(q.tempId, (curr) => {
                                        const nextOpts = [...curr.options];
                                        nextOpts[optIdx] = newVal;
                                        const nextCorrect = currentCorrect.map(
                                          (c) => (c === oldVal ? newVal : c)
                                        );
                                        return {
                                          ...curr,
                                          options: nextOpts,
                                          question_data_json: JSON.stringify(
                                            {
                                              correct_answers: nextCorrect,
                                              required_count:
                                                nextCorrect.length || 2,
                                            },
                                            null,
                                            2
                                          ),
                                        };
                                      });
                                    }}
                                  />
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    options: [...curr.options, ""],
                                  }))
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Option
                              </Button>
                            </div>
                          );
                        })()}

                        {/* TRUE_FALSE_NOT_GIVEN */}
                        {q.question_type === "TRUE_FALSE_NOT_GIVEN" && (
                          <div className="max-w-xs space-y-1.5">
                            <Label>Correct Answer</Label>
                            <Select
                              value={q.correct_answer || "TRUE"}
                              onChange={(e) =>
                                updateQuestion(q.tempId, (curr) => ({
                                  ...curr,
                                  correct_answer: e.target.value,
                                }))
                              }
                            >
                              <option value="TRUE">True</option>
                              <option value="FALSE">False</option>
                              <option value="NOT_GIVEN">Not Given</option>
                            </Select>
                          </div>
                        )}

                        {/* FILL_IN_THE_BLANK */}
                        {q.question_type === "FILL_IN_THE_BLANK" && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>
                                Accepted Answers (comma-separated,
                                case-insensitive)
                              </Label>
                              <Input
                                required
                                placeholder="e.g. had booked, 'd booked"
                                value={q.accepted_answers_text}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    accepted_answers_text: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Optional Keyword / Paragraph Hint (e.g. DECIDE)
                              </Label>
                              <Input
                                placeholder="e.g. DECIDE or Paragraph 2"
                                value={q.keyword}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    keyword: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* SENTENCE_ORDERING */}
                        {q.question_type === "SENTENCE_ORDERING" && (
                          <div className="space-y-1.5">
                            <Label>
                              Sentence Segments in CORRECT Order (one segment
                              per line — shuffled automatically for students)
                            </Label>
                            <Textarea
                              rows={5}
                              required
                              value={q.segments_text}
                              className="bg-white font-mono text-xs"
                              onChange={(e) =>
                                updateQuestion(q.tempId, (curr) => ({
                                  ...curr,
                                  segments_text: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}

                        {/* ERROR_CORRECTION */}
                        {q.question_type === "ERROR_CORRECTION" && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label>Sentence Containing the Error</Label>
                              <Input
                                required
                                placeholder="e.g. She suggested me to take the earlier train."
                                value={q.error_sentence}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    error_sentence: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Highlighted Error Phrase (optional exact match
                                in sentence)
                              </Label>
                              <Input
                                placeholder="e.g. me to take"
                                value={q.error_text}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    error_text: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Accepted Corrections (comma-separated)
                              </Label>
                              <Input
                                required
                                placeholder="e.g. taking, that I take"
                                value={q.error_corrections_text}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    error_corrections_text: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* COMPLEX TYPES (MATCHING, GAPPED_TEXT, INLINE_CLOZE, WORD_BANK_CLOZE) */}
                        {isComplexJsonType(q.question_type) && (
                          <div className="space-y-1.5">
                            <Label>
                              Structured Question Config (JSON — pre-filled with
                              working schema)
                            </Label>
                            <Textarea
                              rows={10}
                              required
                              value={q.question_data_json}
                              className="bg-white font-mono text-xs"
                              onChange={(e) =>
                                updateQuestion(q.tempId, (curr) => ({
                                  ...curr,
                                  question_data_json: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}

                        {/* OPEN_ENDED */}
                        {q.question_type === "OPEN_ENDED" && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Min Target Words (optional)</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="140"
                                value={q.min_words}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    min_words: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Max Target Words (optional)</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="190"
                                value={q.max_words}
                                className="bg-white"
                                onChange={(e) =>
                                  updateQuestion(q.tempId, (curr) => ({
                                    ...curr,
                                    max_words: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label>
                            Explanation (shown in Mistake Review, optional)
                          </Label>
                          <Input
                            placeholder="Explain why this answer is correct..."
                            value={q.explanation}
                            className="bg-white"
                            onChange={(e) =>
                              updateQuestion(q.tempId, (curr) => ({
                                ...curr,
                                explanation: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Assignment
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
