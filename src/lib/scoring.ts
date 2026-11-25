import type { AnswerEntry, Question, SubmissionStatus } from "@/types/database";

export interface ParsedExternalScore {
  valid: boolean;
  percentage: number | null;
  normalizedDisplay: string;
  error?: string;
}

/**
 * Parses an external score input as either:
 *  - Percentage: "85", "85%", "92.5%"
 *  - Fraction: "17/20", "18 / 25"
 * Returns normalized 0-100 percentage rounded to 2 decimal places.
 */
export function parseExternalScore(rawInput: string): ParsedExternalScore {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      percentage: null,
      normalizedDisplay: "",
      error: "Please enter your score (e.g. 85% or 17/20).",
    };
  }

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator <= 0) {
      return {
        valid: false,
        percentage: null,
        normalizedDisplay: "",
        error: "Denominator must be greater than 0.",
      };
    }
    if (numerator < 0 || numerator > denominator) {
      return {
        valid: false,
        percentage: null,
        normalizedDisplay: "",
        error: "Score numerator must be between 0 and the total.",
      };
    }
    const pct = Math.round((numerator / denominator) * 10000) / 100;
    return {
      valid: true,
      percentage: pct,
      normalizedDisplay: `${pct}%`,
    };
  }

  const pctMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (pctMatch) {
    const pct = Number(pctMatch[1]);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return {
        valid: false,
        percentage: null,
        normalizedDisplay: "",
        error: "Percentage must be between 0 and 100.",
      };
    }
    const rounded = Math.round(pct * 100) / 100;
    return {
      valid: true,
      percentage: rounded,
      normalizedDisplay: `${rounded}%`,
    };
  }

  return {
    valid: false,
    percentage: null,
    normalizedDisplay: "",
    error: "Invalid format. Enter a percentage (0–100%) or fraction (e.g. 16/20).",
  };
}

export type ScoreBadgeVariant = "success" | "warning" | "destructive";

/**
 * Returns the badge color variant for a percentage score:
 * - 0–39%: destructive (red)
 * - 40–59%: warning (yellow/ochre)
 * - 60–100%: success (green)
 */
export function getScoreBadgeVariant(
  score: number | null | undefined
): ScoreBadgeVariant {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return "success";
  }
  const n = Number(score);
  if (n < 40) return "destructive";
  if (n < 60) return "warning";
  return "success";
}

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function safeParseRecord(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}

export function safeParseStringArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v));
    }
  } catch {
    // ignore
  }
  return [];
}

export interface GradedExerciseResult {
  answers: Record<string, AnswerEntry>;
  autoGradedPoints: number;
  earnedPoints: number;
  openEndedCount: number;
  percentageScore: number | null;
  status: SubmissionStatus;
}

export function gradeInteractiveExercise(
  questions: Question[],
  rawAnswers: Record<string, string>
): GradedExerciseResult {
  const gradedAnswers: Record<string, AnswerEntry> = {};
  let autoGradedPoints = 0;
  let earnedPoints = 0;
  let openEndedCount = 0;

  for (const q of questions) {
    const userRaw = rawAnswers[q.id] ?? "";
    const trimmed = userRaw.trim();
    const qData = q.question_data ?? {};

    if (
      q.question_type === "MULTIPLE_CHOICE" ||
      q.question_type === "TRUE_FALSE_NOT_GIVEN"
    ) {
      autoGradedPoints += 1;
      const isCorrect =
        q.correct_answer !== null &&
        normalizeText(trimmed) === normalizeText(q.correct_answer);
      if (isCorrect) earnedPoints += 1;
      gradedAnswers[q.id] = { answer: trimmed, is_correct: isCorrect };
    } else if (q.question_type === "FILL_IN_THE_BLANK") {
      autoGradedPoints += 1;
      const accepted = Array.isArray(q.accepted_answers)
        ? q.accepted_answers
        : [];
      const normalizedUser = normalizeText(trimmed);
      const isCorrect =
        normalizedUser.length > 0 &&
        accepted.some((ans) => normalizeText(ans) === normalizedUser);
      if (isCorrect) earnedPoints += 1;
      gradedAnswers[q.id] = { answer: trimmed, is_correct: isCorrect };
    } else if (q.question_type === "ERROR_CORRECTION") {
      autoGradedPoints += 1;
      const accepted = Array.isArray(qData.accepted_corrections)
        ? qData.accepted_corrections
        : Array.isArray(q.accepted_answers)
          ? q.accepted_answers
          : [];
      const normalizedUser = normalizeText(trimmed);
      const isCorrect =
        normalizedUser.length > 0 &&
        accepted.some((ans) => normalizeText(ans) === normalizedUser);
      if (isCorrect) earnedPoints += 1;
      gradedAnswers[q.id] = { answer: trimmed, is_correct: isCorrect };
    } else if (q.question_type === "KEY_WORD_TRANSFORMATION") {
      // Cambridge Use of English Part 4: 2 points per item (supports 1-point partial credit)
      autoGradedPoints += 2;
      const accepted = Array.isArray(qData.accepted_answers)
        ? qData.accepted_answers
        : Array.isArray(q.accepted_answers)
          ? q.accepted_answers
          : [];
      const keyword = (qData.keyword ?? q.keyword ?? "").trim();
      const minW = qData.min_words ?? q.min_words ?? 2;
      const maxW = qData.max_words ?? q.max_words ?? 5;
      const wc = countWords(trimmed);
      const withinWords = wc >= minW && wc <= maxW;
      const normalizedUser = normalizeText(trimmed);
      const hasKeyword =
        !keyword ||
        new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
          normalizedUser
        );

      let pts = 0;
      if (withinWords && hasKeyword && normalizedUser.length > 0) {
        const isExact = accepted.some(
          (ans) => normalizeText(ans) === normalizedUser
        );
        if (isExact) {
          pts = 2;
        } else if (
          Array.isArray(qData.half_credit_parts) &&
          qData.half_credit_parts.length >= 2
        ) {
          const matchedHalves = qData.half_credit_parts.filter(
            (part) =>
              part.trim().length > 0 &&
              normalizedUser.includes(normalizeText(part))
          ).length;
          pts = matchedHalves >= 2 ? 2 : matchedHalves === 1 ? 1 : 0;
        } else if (accepted.length > 0) {
          // Fallback partial credit: if student gets >= 50% of words in any accepted answer right
          const userWords = new Set(normalizedUser.split(" "));
          const gotHalf = accepted.some((ans) => {
            const targetWords = normalizeText(ans).split(" ");
            const overlap = targetWords.filter((w) => userWords.has(w)).length;
            return overlap >= Math.ceil(targetWords.length / 2);
          });
          pts = gotHalf ? 1 : 0;
        }
      }

      earnedPoints += pts;
      gradedAnswers[q.id] = {
        answer: trimmed,
        is_correct: pts === 2,
        word_count: wc,
        points_earned: pts,
        points_possible: 2,
      };
    } else if (q.question_type === "MULTIPLE_SELECT") {
      const correctList = Array.isArray(qData.correct_answers)
        ? qData.correct_answers
        : [];
      const normalizedCorrect = new Set(correctList.map(normalizeText));
      const userSelected = safeParseStringArray(userRaw);
      const possible = Math.max(correctList.length, 1);
      autoGradedPoints += possible;

      let rightCount = 0;
      let wrongCount = 0;
      for (const pick of userSelected) {
        if (normalizedCorrect.has(normalizeText(pick))) rightCount += 1;
        else wrongCount += 1;
      }
      const pts = Math.max(0, rightCount - wrongCount);
      earnedPoints += pts;
      const isFullyCorrect =
        rightCount === correctList.length && wrongCount === 0;

      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: isFullyCorrect,
        points_earned: pts,
        points_possible: possible,
      };
    } else if (q.question_type === "CATEGORIZE") {
      const items = Array.isArray(qData.items) ? qData.items : [];
      const userMap = safeParseRecord(userRaw);
      const itemResults: Record<string, boolean> = {};
      let allCorrect = items.length > 0;
      for (const item of items) {
        autoGradedPoints += 1;
        const ok =
          normalizeText(userMap[item.id] ?? "") ===
          normalizeText(item.correct_category);
        itemResults[item.id] = ok;
        if (ok) earnedPoints += 1;
        else allCorrect = false;
      }
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: allCorrect,
        item_results: itemResults,
      };
    } else if (q.question_type === "SPEAKING_RECORDING") {
      openEndedCount += 1;
      gradedAnswers[q.id] = {
        answer: trimmed,
        is_correct: null,
      };
    } else if (q.question_type === "SENTENCE_ORDERING") {
      autoGradedPoints += 1;
      const targetSegments = Array.isArray(qData.segments) ? qData.segments : [];
      const userSegments = safeParseStringArray(userRaw);
      const isCorrect =
        targetSegments.length > 0 &&
        userSegments.length === targetSegments.length &&
        normalizeText(userSegments.join(" ")) ===
          normalizeText(targetSegments.join(" "));
      if (isCorrect) earnedPoints += 1;
      gradedAnswers[q.id] = { answer: userRaw, is_correct: isCorrect };
    } else if (q.question_type === "MATCHING") {
      const pairs = Array.isArray(qData.pairs) ? qData.pairs : [];
      const userMap = safeParseRecord(userRaw);
      const itemResults: Record<string, boolean> = {};
      let allCorrect = pairs.length > 0;
      for (const pair of pairs) {
        autoGradedPoints += 1;
        const ok =
          normalizeText(userMap[pair.id] ?? "") === normalizeText(pair.match);
        itemResults[pair.id] = ok;
        if (ok) earnedPoints += 1;
        else allCorrect = false;
      }
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: allCorrect,
        item_results: itemResults,
      };
    } else if (q.question_type === "GAPPED_TEXT") {
      const gaps = Array.isArray(qData.gapped_gaps) ? qData.gapped_gaps : [];
      const userMap = safeParseRecord(userRaw);
      const itemResults: Record<string, boolean> = {};
      let allCorrect = gaps.length > 0;
      for (const gap of gaps) {
        autoGradedPoints += 1;
        const ok =
          normalizeText(userMap[gap.id] ?? "") ===
          normalizeText(gap.correct_label);
        itemResults[gap.id] = ok;
        if (ok) earnedPoints += 1;
        else allCorrect = false;
      }
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: allCorrect,
        item_results: itemResults,
      };
    } else if (q.question_type === "INLINE_CLOZE") {
      const gaps = Array.isArray(qData.inline_gaps) ? qData.inline_gaps : [];
      const userMap = safeParseRecord(userRaw);
      const itemResults: Record<string, boolean> = {};
      let allCorrect = gaps.length > 0;
      for (const gap of gaps) {
        autoGradedPoints += 1;
        const ok =
          normalizeText(userMap[gap.id] ?? "") ===
          normalizeText(gap.correct_answer);
        itemResults[gap.id] = ok;
        if (ok) earnedPoints += 1;
        else allCorrect = false;
      }
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: allCorrect,
        item_results: itemResults,
      };
    } else if (q.question_type === "WORD_BANK_CLOZE") {
      const gaps = Array.isArray(qData.word_bank_gaps)
        ? qData.word_bank_gaps
        : [];
      const userMap = safeParseRecord(userRaw);
      const itemResults: Record<string, boolean> = {};
      let allCorrect = gaps.length > 0;
      for (const gap of gaps) {
        autoGradedPoints += 1;
        const ok =
          normalizeText(userMap[gap.id] ?? "") ===
          normalizeText(gap.correct_answer);
        itemResults[gap.id] = ok;
        if (ok) earnedPoints += 1;
        else allCorrect = false;
      }
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: allCorrect,
        item_results: itemResults,
      };
    } else {
      // OPEN_ENDED
      openEndedCount += 1;
      gradedAnswers[q.id] = {
        answer: userRaw,
        is_correct: null,
        word_count: countWords(userRaw),
      };
    }
  }

  const percentageScore =
    autoGradedPoints > 0
      ? Math.round((earnedPoints / autoGradedPoints) * 10000) / 100
      : null;

  const status: SubmissionStatus =
    openEndedCount > 0 ? "PENDING_REVIEW" : "COMPLETED";

  return {
    answers: gradedAnswers,
    autoGradedPoints,
    earnedPoints,
    openEndedCount,
    percentageScore,
    status,
  };
}
