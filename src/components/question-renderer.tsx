"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import {
  countWords,
  safeParseRecord,
  safeParseStringArray,
} from "@/lib/scoring";
import type { AnswerEntry, Question } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SpeakingRecorder } from "@/components/speaking-recorder";
import { cn } from "@/lib/utils";

interface QuestionRendererProps {
  question: Question;
  userId: string;
  value: string;
  onChange: (val: string) => void;
  isReviewMode: boolean;
  gradedEntry?: AnswerEntry;
}

function deterministicShuffle(items: string[], seed: string): string[] {
  const arr = [...items];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function QuestionRenderer({
  question: q,
  userId,
  value,
  onChange,
  isReviewMode,
  gradedEntry,
}: QuestionRendererProps) {
  const qData = q.question_data ?? {};
  const isCorrect = gradedEntry?.is_correct === true;
  const isWrong = gradedEntry?.is_correct === false;
  const itemResults = gradedEntry?.item_results ?? {};

  // Active blank tracker for WORD_BANK_CLOZE
  const [activeGapId, setActiveGapId] = useState<string | null>(null);

  // Shuffled segments for SENTENCE_ORDERING
  const shuffledSegments = useMemo(() => {
    const segs = Array.isArray(qData.segments) ? qData.segments : [];
    return deterministicShuffle(segs, q.id);
  }, [q.id, qData.segments]);

  // Sorted unique match choices for MATCHING
  const matchingChoices = useMemo(() => {
    const pairs = Array.isArray(qData.pairs) ? qData.pairs : [];
    const distractors = Array.isArray(qData.distractors)
      ? qData.distractors
      : [];
    return Array.from(
      new Set([...pairs.map((p) => p.match), ...distractors].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [qData.pairs, qData.distractors]);

  const words = countWords(value);
  const withinWordRange =
    q.question_type === "OPEN_ENDED" &&
    (q.min_words === null || words >= q.min_words) &&
    (q.max_words === null || words <= q.max_words);

  function updateRecord(key: string, val: string) {
    const curr = safeParseRecord(value);
    onChange(JSON.stringify({ ...curr, [key]: val }));
  }

  return (
    <div className="mt-3 space-y-4">
      {/* Optional Image attached to any question */}
      {q.image_url && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={q.image_url}
            alt="Question visual prompt"
            className="mx-auto max-h-72 rounded-lg object-contain"
          />
        </div>
      )}

      <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-900">
        {q.prompt}
      </p>

      {/* 1. MULTIPLE CHOICE */}
      {q.question_type === "MULTIPLE_CHOICE" && (
        <div className="space-y-2.5">
          {(q.options ?? []).map((option, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const selected = value === option;
            const isOptionCorrect =
              q.correct_answer !== null &&
              option.trim().toLowerCase() ===
                q.correct_answer.trim().toLowerCase();

            return (
              <label
                key={optIdx}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all",
                  !isReviewMode && "cursor-pointer hover:bg-slate-50",
                  !isReviewMode &&
                    selected &&
                    "border-[#0f2544] bg-slate-100 ring-1 ring-[#0f2544]",
                  isReviewMode &&
                    isOptionCorrect &&
                    "border-[#3E6B52] bg-[#3E6B52]/10 font-medium text-[#2B4D3A]",
                  isReviewMode &&
                    selected &&
                    !isOptionCorrect &&
                    "border-[#8B3A3A] bg-[#8B3A3A]/10 text-[#6E2C2C]",
                  isReviewMode &&
                    !selected &&
                    !isOptionCorrect &&
                    "border-slate-200 opacity-70"
                )}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={option}
                  checked={selected}
                  disabled={isReviewMode}
                  onChange={() => onChange(option)}
                  className="h-4 w-4 accent-[#0f2544]"
                />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                  {letter}
                </span>
                <span className="flex-1">{option}</span>
                {isReviewMode && isOptionCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-[#3E6B52]" />
                )}
                {isReviewMode && selected && !isOptionCorrect && (
                  <XCircle className="h-4 w-4 text-[#8B3A3A]" />
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* 2. TRUE / FALSE / NOT GIVEN */}
      {q.question_type === "TRUE_FALSE_NOT_GIVEN" && (
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { val: "TRUE", label: "True" },
              { val: "FALSE", label: "False" },
              { val: "NOT_GIVEN", label: "Not Given" },
            ] as const
          ).map((opt) => {
            const selected = value.toUpperCase() === opt.val;
            const isOptCorrect =
              (q.correct_answer ?? "").toUpperCase() === opt.val;
            return (
              <button
                key={opt.val}
                type="button"
                disabled={isReviewMode}
                onClick={() => onChange(opt.val)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                  !isReviewMode && "cursor-pointer hover:bg-slate-50",
                  !isReviewMode &&
                    selected &&
                    "border-[#0f2544] bg-[#0f2544] text-white",
                  isReviewMode &&
                    isOptCorrect &&
                    "border-[#3E6B52] bg-[#3E6B52]/10 text-[#2B4D3A]",
                  isReviewMode &&
                    selected &&
                    !isOptCorrect &&
                    "border-[#8B3A3A] bg-[#8B3A3A]/10 text-[#6E2C2C]",
                  isReviewMode &&
                    !selected &&
                    !isOptCorrect &&
                    "border-slate-200 text-slate-400"
                )}
              >
                {opt.label}
                {isReviewMode && isOptCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-[#3E6B52]" />
                )}
                {isReviewMode && selected && !isOptCorrect && (
                  <XCircle className="h-4 w-4 text-[#8B3A3A]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. FILL IN THE BLANK */}
      {q.question_type === "FILL_IN_THE_BLANK" && (
        <div className="space-y-2">
          <Input
            type="text"
            disabled={isReviewMode}
            placeholder="Type your answer..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              isReviewMode &&
                isCorrect &&
                "border-[#3E6B52] bg-[#3E6B52]/10 font-medium text-[#2B4D3A]",
              isReviewMode &&
                isWrong &&
                "border-[#8B3A3A] bg-[#8B3A3A]/10 text-[#6E2C2C]"
            )}
          />
          {isReviewMode && isWrong && (
            <p className="text-xs font-medium text-[#2B4D3A]">
              Accepted answer(s):{" "}
              <span className="rounded-sm bg-[#3E6B52]/15 px-1.5 py-0.5 font-semibold text-[#2B4D3A]">
                {(q.accepted_answers ?? []).join(" / ")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* 4. OPEN ENDED */}
      {q.question_type === "OPEN_ENDED" && (
        <div className="space-y-2">
          <Textarea
            rows={8}
            disabled={isReviewMode}
            placeholder="Write your response here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
                words === 0
                  ? "bg-slate-100 text-slate-600"
                  : withinWordRange
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
              )}
            >
              Word count: {words}
              {(q.min_words !== null || q.max_words !== null) && (
                <span>
                  {" "}
                  (Target: {q.min_words ?? 0}–{q.max_words ?? "∞"} words)
                </span>
              )}
            </span>
            {!isReviewMode && q.min_words !== null && words < q.min_words && (
              <span className="text-slate-500">
                {q.min_words - words} more words to reach minimum
              </span>
            )}
            {!isReviewMode && q.max_words !== null && words > q.max_words && (
              <span className="text-amber-700">
                {words - q.max_words} words over target maximum
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. MATCHING (Paragraphs / Synonyms / Definitions) */}
      {q.question_type === "MATCHING" && (
        <div className="space-y-2.5">
          {(qData.pairs ?? []).map((pair, idx) => {
            const userMap = safeParseRecord(value);
            const selected = userMap[pair.id] ?? "";
            const ok = itemResults[pair.id] === true;
            const bad = isReviewMode && !ok;
            return (
              <div
                key={pair.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between",
                  isReviewMode && ok && "border-emerald-300 bg-emerald-50/50",
                  bad && "border-red-300 bg-red-50/50",
                  !isReviewMode && "border-slate-200 bg-slate-50/40"
                )}
              >
                <div className="flex items-start gap-2 text-sm text-slate-800">
                  <span className="font-semibold text-[#0f2544]">
                    {idx + 1}.
                  </span>
                  <span>{pair.prompt}</span>
                </div>
                <div className="flex flex-col items-end gap-1 sm:w-56 sm:shrink-0">
                  <Select
                    disabled={isReviewMode}
                    value={selected}
                    onChange={(e) => updateRecord(pair.id, e.target.value)}
                    className={cn(
                      isReviewMode && ok && "border-emerald-500 bg-emerald-50",
                      bad && "border-red-400 bg-red-50"
                    )}
                  >
                    <option value="">Select match...</option>
                    {matchingChoices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </Select>
                  {bad && (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Correct: {pair.match}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. GAPPED TEXT (Paragraph / Sentence Filling) */}
      {q.question_type === "GAPPED_TEXT" && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Removed Paragraphs / Sentences (choose the best fit for each gap)
            </p>
            <div className="grid gap-2">
              {(qData.passages ?? []).map((p) => (
                <div
                  key={p.label}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0f2544] text-xs font-bold text-white">
                    {p.label}
                  </span>
                  <p className="leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(qData.gapped_gaps ?? []).map((gap) => {
              const userMap = safeParseRecord(value);
              const selected = userMap[gap.id] ?? "";
              const ok = itemResults[gap.id] === true;
              const bad = isReviewMode && !ok;
              return (
                <div
                  key={gap.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3",
                    isReviewMode && ok && "border-emerald-300 bg-emerald-50/50",
                    bad && "border-red-300 bg-red-50/50",
                    !isReviewMode && "border-slate-200 bg-white"
                  )}
                >
                  <span className="text-sm font-semibold text-[#0f2544]">
                    Gap [{gap.id}]
                  </span>
                  <div className="flex items-center gap-2">
                    <Select
                      disabled={isReviewMode}
                      value={selected}
                      onChange={(e) => updateRecord(gap.id, e.target.value)}
                      className="h-9 w-28"
                    >
                      <option value="">Letter...</option>
                      {(qData.passages ?? []).map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                    {bad && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
                        {gap.correct_label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. INLINE CLOZE (Dropdown Gaps Inside Text) */}
      {q.question_type === "INLINE_CLOZE" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[15px] leading-9 text-slate-800">
          {(qData.text ?? "").split(/(\{\{[^}]+\}\})/g).map((part, idx) => {
            const match = part.match(/^\{\{([^}]+)\}\}$/);
            if (!match) {
              return (
                <span key={idx} className="whitespace-pre-line">
                  {part}
                </span>
              );
            }
            const gapId = match[1].trim();
            const gapDef = (qData.inline_gaps ?? []).find(
              (g) => g.id === gapId
            );
            if (!gapDef) return <span key={idx}>{part}</span>;

            const userMap = safeParseRecord(value);
            const selected = userMap[gapId] ?? "";
            const ok = itemResults[gapId] === true;
            const bad = isReviewMode && !ok;

            return (
              <span key={idx} className="mx-1 inline-flex items-center gap-1">
                <select
                  disabled={isReviewMode}
                  value={selected}
                  onChange={(e) => updateRecord(gapId, e.target.value)}
                  className={cn(
                    "inline-block h-8 rounded-md border px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f2544]",
                    !isReviewMode && "border-slate-300 bg-white text-[#0f2544]",
                    isReviewMode &&
                      ok &&
                      "border-emerald-500 bg-emerald-50 text-emerald-900",
                    bad && "border-red-400 bg-red-50 text-red-900"
                  )}
                >
                  <option value="">({gapId}) ---</option>
                  {gapDef.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {bad && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {gapDef.correct_answer}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* 8. WORD BANK CLOZE (Click-to-Fill Word Bank) */}
      {q.question_type === "WORD_BANK_CLOZE" && (() => {
        const userMap = safeParseRecord(value);
        const usedValues = new Set(Object.values(userMap).filter(Boolean));
        const allGapIds = (qData.word_bank_gaps ?? []).map((g) => g.id);

        function handleWordClick(word: string) {
          if (isReviewMode) return;
          const targetGap =
            activeGapId ??
            allGapIds.find((id) => !userMap[id]) ??
            allGapIds[0];
          if (!targetGap) return;
          updateRecord(targetGap, word);
          const nextEmpty = allGapIds.find(
            (id) => id !== targetGap && !userMap[id]
          );
          setActiveGapId(nextEmpty ?? null);
        }

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Word Bank (click a word to fill the active blank)
              </p>
              <div className="flex flex-wrap gap-2">
                {(qData.word_bank ?? []).map((word, idx) => {
                  const used = usedValues.has(word);
                  return (
                    <button
                      key={`${word}-${idx}`}
                      type="button"
                      disabled={isReviewMode}
                      onClick={() => handleWordClick(word)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                        !isReviewMode && "cursor-pointer",
                        used
                          ? "border-slate-200 bg-slate-100 text-slate-400 line-through"
                          : "border-[#0f2544]/20 bg-white text-[#0f2544] shadow-2xs hover:border-[#0f766e] hover:bg-teal-50"
                      )}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-[15px] leading-9 text-slate-800">
              {(qData.text ?? "").split(/(\{\{[^}]+\}\})/g).map((part, idx) => {
                const match = part.match(/^\{\{([^}]+)\}\}$/);
                if (!match) {
                  return (
                    <span key={idx} className="whitespace-pre-line">
                      {part}
                    </span>
                  );
                }
                const gapId = match[1].trim();
                const gapDef = (qData.word_bank_gaps ?? []).find(
                  (g) => g.id === gapId
                );
                const filled = userMap[gapId] ?? "";
                const ok = itemResults[gapId] === true;
                const bad = isReviewMode && !ok;
                const isFocused = activeGapId === gapId;

                return (
                  <span
                    key={idx}
                    className="mx-1 inline-flex items-center gap-1"
                  >
                    <button
                      type="button"
                      disabled={isReviewMode}
                      onClick={() => {
                        if (filled) {
                          updateRecord(gapId, "");
                          setActiveGapId(gapId);
                        } else {
                          setActiveGapId(gapId);
                        }
                      }}
                      className={cn(
                        "inline-flex min-w-[90px] items-center justify-center rounded-md border-b-2 px-2.5 py-0.5 text-sm font-semibold transition-colors",
                        !isReviewMode && "cursor-pointer",
                        !isReviewMode &&
                          isFocused &&
                          "border-[#0f766e] bg-teal-50 text-[#0f766e]",
                        !isReviewMode &&
                          !isFocused &&
                          filled &&
                          "border-[#0f2544] bg-slate-100 text-[#0f2544]",
                        !isReviewMode &&
                          !isFocused &&
                          !filled &&
                          "border-slate-300 bg-slate-50 text-slate-400",
                        isReviewMode &&
                          ok &&
                          "border-emerald-500 bg-emerald-50 text-emerald-900",
                        bad && "border-red-400 bg-red-50 text-red-900"
                      )}
                      title={filled ? "Click to clear" : "Click to select blank"}
                    >
                      {filled || `[ ${gapId} ]`}
                    </button>
                    {bad && gapDef && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {gapDef.correct_answer}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 9. SENTENCE ORDERING (Word / Clause Scramble) */}
      {q.question_type === "SENTENCE_ORDERING" && (() => {
        const placed = safeParseStringArray(value);
        // Track remaining pool handling duplicate segments cleanly
        const remaining = [...shuffledSegments];
        for (const p of placed) {
          const idx = remaining.indexOf(p);
          if (idx !== -1) remaining.splice(idx, 1);
        }

        return (
          <div className="space-y-3">
            {/* Constructed sentence zone */}
            <div
              className={cn(
                "min-h-[56px] rounded-xl border-2 border-dashed p-3 flex flex-wrap items-center gap-2",
                isReviewMode && isCorrect && "border-emerald-400 bg-emerald-50/50",
                isReviewMode && isWrong && "border-red-400 bg-red-50/50",
                !isReviewMode && "border-slate-300 bg-slate-50/60"
              )}
            >
              {placed.length === 0 ? (
                <span className="text-xs text-slate-400">
                  Click the segments below in the correct order to build the
                  sentence...
                </span>
              ) : (
                placed.map((seg, idx) => (
                  <button
                    key={`${seg}-${idx}`}
                    type="button"
                    disabled={isReviewMode}
                    onClick={() => {
                      const next = [...placed];
                      next.splice(idx, 1);
                      onChange(JSON.stringify(next));
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium",
                      !isReviewMode &&
                        "cursor-pointer border-[#0f766e] bg-[#0f766e] text-white hover:bg-[#0d625b]",
                      isReviewMode &&
                        isCorrect &&
                        "border-emerald-500 bg-emerald-100 text-emerald-950",
                      isReviewMode &&
                        isWrong &&
                        "border-red-400 bg-red-100 text-red-900"
                    )}
                  >
                    {seg}
                  </button>
                ))
              )}
              {!isReviewMode && placed.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange("[]")}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Available segment pool */}
            {!isReviewMode && remaining.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {remaining.map((seg, idx) => (
                  <button
                    key={`${seg}-${idx}`}
                    type="button"
                    onClick={() => onChange(JSON.stringify([...placed, seg]))}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0f2544] shadow-2xs hover:border-[#0f766e] hover:bg-teal-50"
                  >
                    {seg}
                  </button>
                ))}
              </div>
            )}

            {isReviewMode && isWrong && (
              <p className="text-xs font-medium text-emerald-700">
                Correct order:{" "}
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold">
                  {(qData.segments ?? []).join(" ")}
                </span>
              </p>
            )}
          </div>
        );
      })()}

      {/* 10. ERROR CORRECTION */}
      {q.question_type === "ERROR_CORRECTION" && (() => {
        const sentence = qData.sentence ?? "";
        const errText = qData.error_text ?? "";
        const hasHighlight = errText && sentence.includes(errText);
        const parts = hasHighlight ? sentence.split(errText) : [sentence];

        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-800">
              {hasHighlight ? (
                <>
                  {parts[0]}
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900 underline decoration-amber-500 decoration-wavy underline-offset-4">
                    {errText}
                  </span>
                  {parts.slice(1).join(errText)}
                </>
              ) : (
                sentence
              )}
            </div>

            <Input
              type="text"
              disabled={isReviewMode}
              placeholder="Type the corrected word or phrase..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                isReviewMode &&
                  isCorrect &&
                  "border-emerald-500 bg-emerald-50 font-medium text-emerald-900",
                isReviewMode &&
                  isWrong &&
                  "border-red-400 bg-red-50 text-red-900"
              )}
            />

            {isReviewMode && isWrong && (
              <p className="text-xs font-medium text-emerald-700">
                Accepted correction(s):{" "}
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold">
                  {(qData.accepted_corrections ?? q.accepted_answers ?? []).join(
                    " / "
                  )}
                </span>
              </p>
            )}
          </div>
        );
      })()}

      {/* 11. KEY WORD TRANSFORMATION (Cambridge Use of English Part 4 — 2 pts with partial credit) */}
      {q.question_type === "KEY_WORD_TRANSFORMATION" && (() => {
        const origSentence = qData.original_sentence ?? "";
        const kw = (qData.keyword ?? q.keyword ?? "").trim();
        const prefix = qData.prefix_text ?? "";
        const suffix = qData.suffix_text ?? "";
        const minW = qData.min_words ?? q.min_words ?? 2;
        const maxW = qData.max_words ?? q.max_words ?? 5;
        const accepted = qData.accepted_answers ?? q.accepted_answers ?? [];
        const wc = countWords(value);
        const withinRange = wc >= minW && wc <= maxW;
        const hasKw =
          !kw ||
          new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
            value.trim()
          );
        const ptsEarned = gradedEntry?.points_earned;
        const ptsPossible = gradedEntry?.points_possible ?? 2;

        return (
          <div className="space-y-3">
            {/* Original sentence + bolded KEY WORD */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <p className="text-[15px] font-medium text-slate-900">
                {origSentence}
              </p>
              {kw && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#0f2544]/20 bg-[#0f2544] px-3 py-1 text-xs font-bold tracking-wider text-white">
                  {kw.toUpperCase()}
                </div>
              )}
            </div>

            {/* Second sentence with inline middle gap */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[15px] leading-relaxed text-slate-800">
                {prefix && <span>{prefix}</span>}
                <Input
                  type="text"
                  disabled={isReviewMode}
                  placeholder={`Type ${minW}–${maxW} words...`}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={cn(
                    "inline-block h-9 w-64 max-w-full font-medium",
                    isReviewMode &&
                      ptsEarned === 2 &&
                      "border-[#3E6B52] bg-[#3E6B52]/10 text-[#2B4D3A]",
                    isReviewMode &&
                      ptsEarned === 1 &&
                      "border-[#9A6B2F] bg-[#9A6B2F]/10 text-[#734F22]",
                    isReviewMode &&
                      ptsEarned === 0 &&
                      "border-[#8B3A3A] bg-[#8B3A3A]/10 text-[#6E2C2C]"
                  )}
                />
                {suffix && <span>{suffix}</span>}
              </div>

              {/* Live word-count & keyword check */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold",
                    wc === 0
                      ? "bg-slate-100 text-slate-600"
                      : withinRange
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                  )}
                >
                  {wc} / {minW}–{maxW} words
                </span>
                {kw && wc > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold",
                      hasKw
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {hasKw
                      ? `Includes "${kw.toUpperCase()}"`
                      : `Must include "${kw.toUpperCase()}" unchanged`}
                  </span>
                )}
                {isReviewMode && ptsEarned !== undefined && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 font-bold",
                      ptsEarned === 2
                        ? "bg-emerald-100 text-emerald-800"
                        : ptsEarned === 1
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                    )}
                  >
                    {ptsEarned} / {ptsPossible} pts
                    {ptsEarned === 1 ? " (Partial Credit)" : ""}
                  </span>
                )}
              </div>
            </div>

            {isReviewMode && ptsEarned !== 2 && accepted.length > 0 && (
              <p className="text-xs font-medium text-emerald-700">
                Accepted transformation(s):{" "}
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold">
                  {accepted.join(" / ")}
                </span>
              </p>
            )}
          </div>
        );
      })()}

      {/* 12. MULTIPLE SELECT (Choose TWO / THREE correct answers) */}
      {q.question_type === "MULTIPLE_SELECT" && (() => {
        const selectedList = safeParseStringArray(value);
        const correctList = qData.correct_answers ?? [];
        const normalizedCorrect = new Set(
          correctList.map((c) => c.trim().toLowerCase())
        );
        const required = qData.required_count ?? correctList.length;

        function toggleOption(option: string) {
          if (isReviewMode) return;
          const exists = selectedList.includes(option);
          const next = exists
            ? selectedList.filter((o) => o !== option)
            : [...selectedList, option];
          onChange(JSON.stringify(next));
        }

        return (
          <div className="space-y-2.5">
            {required > 0 && !isReviewMode && (
              <p className="text-xs font-semibold text-[#0f766e]">
                Select {required} answers ({selectedList.length}/{required}{" "}
                selected)
              </p>
            )}
            {(q.options ?? []).map((option, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const checked = selectedList.includes(option);
              const isOptCorrect = normalizedCorrect.has(
                option.trim().toLowerCase()
              );

              return (
                <label
                  key={optIdx}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all",
                    !isReviewMode && "cursor-pointer hover:bg-slate-50",
                    !isReviewMode &&
                      checked &&
                      "border-[#0f2544] bg-slate-100 ring-1 ring-[#0f2544]",
                    isReviewMode &&
                      isOptCorrect &&
                      checked &&
                      "border-[#3E6B52] bg-[#3E6B52]/10 font-medium text-[#2B4D3A]",
                    isReviewMode &&
                      isOptCorrect &&
                      !checked &&
                      "border-[#3E6B52]/60 border-dashed bg-[#3E6B52]/5 text-[#2B4D3A]",
                    isReviewMode &&
                      checked &&
                      !isOptCorrect &&
                      "border-[#8B3A3A] bg-[#8B3A3A]/10 text-[#6E2C2C]",
                    isReviewMode &&
                      !checked &&
                      !isOptCorrect &&
                      "border-slate-200 opacity-70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isReviewMode}
                    onChange={() => toggleOption(option)}
                    className="h-4 w-4 rounded accent-[#0f2544]"
                  />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isReviewMode && isOptCorrect && (
                    <CheckCircle2 className="h-4 w-4 text-[#3E6B52]" />
                  )}
                  {isReviewMode && checked && !isOptCorrect && (
                    <XCircle className="h-4 w-4 text-[#8B3A3A]" />
                  )}
                </label>
              );
            })}
          </div>
        );
      })()}

      {/* 13. CATEGORIZE (Sort words/phrases into 2–3 buckets) */}
      {q.question_type === "CATEGORIZE" && (() => {
        const categories = qData.categories ?? [];
        const items = qData.items ?? [];
        const userMap = safeParseRecord(value);

        return (
          <div className="space-y-2.5">
            {items.map((item) => {
              const picked = userMap[item.id] ?? "";
              const ok = itemResults[item.id] === true;
              const bad = isReviewMode && !ok;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between",
                    isReviewMode && ok && "border-[#3E6B52]/50 bg-[#3E6B52]/10",
                    bad && "border-[#8B3A3A]/50 bg-[#8B3A3A]/10",
                    !isReviewMode && "border-slate-200 bg-slate-50/40"
                  )}
                >
                  <span className="text-sm font-medium text-slate-900">
                    {item.text}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {categories.map((cat) => {
                      const active = picked === cat;
                      const isRightCat =
                        cat.trim().toLowerCase() ===
                        item.correct_category.trim().toLowerCase();
                      return (
                        <button
                          key={cat}
                          type="button"
                          disabled={isReviewMode}
                          onClick={() => updateRecord(item.id, cat)}
                          className={cn(
                            "rounded-sm border px-3 py-1 text-xs font-semibold transition-all",
                            !isReviewMode && "cursor-pointer",
                            !isReviewMode &&
                              active &&
                              "border-[#0f2544] bg-[#0f2544] text-white",
                            !isReviewMode &&
                              !active &&
                              "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            isReviewMode &&
                              isRightCat &&
                              "border-[#3E6B52] bg-[#3E6B52] text-white",
                            isReviewMode &&
                              active &&
                              !isRightCat &&
                              "border-[#8B3A3A] bg-[#8B3A3A] text-white",
                            isReviewMode &&
                              !active &&
                              !isRightCat &&
                              "border-slate-200 bg-white text-slate-400"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* 14. SPEAKING RECORDING (Browser audio capture uploaded to Supabase Storage) */}
      {q.question_type === "SPEAKING_RECORDING" && (
        <SpeakingRecorder
          userId={userId}
          questionId={q.id}
          value={value}
          onChange={onChange}
          disabled={isReviewMode}
          minSeconds={qData.min_seconds}
          maxSeconds={qData.max_seconds}
        />
      )}
    </div>
  );
}
