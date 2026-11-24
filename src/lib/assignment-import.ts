import type {
  AssignmentCategory,
  AssignmentPhase,
  AssignmentType,
  ExamLevel,
  MediaType,
  QuestionData,
  QuestionType,
} from "@/types/database";

export interface ImportedQuestionPayload {
  question_type: QuestionType;
  prompt: string;
  options?: string[];
  correct_answer?: string | null;
  accepted_answers?: string[];
  keyword?: string | null;
  min_words?: number | null;
  max_words?: number | null;
  image_url?: string | null;
  question_data?: QuestionData;
  explanation?: string | null;
}

export interface ImportedAssignmentPayload {
  title: string;
  instructions: string;
  level: ExamLevel;
  category: AssignmentCategory;
  assignment_type: AssignmentType;
  external_url: string | null;
  media_type: MediaType;
  media_content: string | null;
  media_start_time: string | null;
  media_end_time: string | null;
  media_audio_only: boolean;
  phases: AssignmentPhase[];
  is_published: boolean;
  questions: ImportedQuestionPayload[];
}

const VALID_LEVELS: ExamLevel[] = ["B2_FIRST", "C1_ADVANCED"];
const VALID_CATEGORIES: AssignmentCategory[] = [
  "READING",
  "LISTENING",
  "WRITING",
  "VOCABULARY",
  "GRAMMAR",
  "USE_OF_ENGLISH",
];
const VALID_TYPES: AssignmentType[] = ["EXTERNAL_LINK", "INTERACTIVE_EXERCISE"];
const VALID_MEDIA: MediaType[] = [
  "NONE",
  "READING_PASSAGE",
  "VIDEO_URL",
  "AUDIO_MP4_UPLOAD",
];
const VALID_Q_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "FILL_IN_THE_BLANK",
  "OPEN_ENDED",
  "TRUE_FALSE_NOT_GIVEN",
  "MATCHING",
  "GAPPED_TEXT",
  "INLINE_CLOZE",
  "WORD_BANK_CLOZE",
  "SENTENCE_ORDERING",
  "ERROR_CORRECTION",
  "KEY_WORD_TRANSFORMATION",
  "MULTIPLE_SELECT",
  "CATEGORIZE",
  "SPEAKING_RECORDING",
];

export function parseAssignmentImportJson(rawJson: string): {
  valid: boolean;
  data?: ImportedAssignmentPayload;
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return {
      valid: false,
      error: `Invalid JSON syntax: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, error: "JSON root must be an object." };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.title !== "string" || !obj.title.trim()) {
    return { valid: false, error: 'Missing required string field "title".' };
  }
  if (!VALID_LEVELS.includes(obj.level as ExamLevel)) {
    return {
      valid: false,
      error: `Field "level" must be one of: ${VALID_LEVELS.join(", ")}.`,
    };
  }
  if (!VALID_CATEGORIES.includes(obj.category as AssignmentCategory)) {
    return {
      valid: false,
      error: `Field "category" must be one of: ${VALID_CATEGORIES.join(", ")}.`,
    };
  }
  if (!VALID_TYPES.includes(obj.assignment_type as AssignmentType)) {
    return {
      valid: false,
      error: `Field "assignment_type" must be one of: ${VALID_TYPES.join(", ")}.`,
    };
  }

  const mediaType = (obj.media_type ?? "NONE") as MediaType;
  if (!VALID_MEDIA.includes(mediaType)) {
    return {
      valid: false,
      error: `Field "media_type" must be one of: ${VALID_MEDIA.join(", ")}.`,
    };
  }

  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];
  const validatedQuestions: ImportedQuestionPayload[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i] as Record<string, unknown>;
    if (!q || typeof q !== "object") {
      return { valid: false, error: `Question #${i + 1} must be an object.` };
    }
    if (!VALID_Q_TYPES.includes(q.question_type as QuestionType)) {
      return {
        valid: false,
        error: `Question #${i + 1} has invalid "question_type" (expected ${VALID_Q_TYPES.join(", ")}).`,
      };
    }
    if (typeof q.prompt !== "string" || !q.prompt.trim()) {
      return {
        valid: false,
        error: `Question #${i + 1} is missing a non-empty "prompt".`,
      };
    }

    const qType = q.question_type as QuestionType;
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    const acceptedAnswers = Array.isArray(q.accepted_answers)
      ? q.accepted_answers.map((a) => String(a).trim()).filter(Boolean)
      : [];
    const qData =
      q.question_data && typeof q.question_data === "object"
        ? (q.question_data as QuestionData)
        : {};

    if (qType === "MULTIPLE_CHOICE" && options.length < 2) {
      return {
        valid: false,
        error: `Question #${i + 1} (MULTIPLE_CHOICE) needs at least 2 options.`,
      };
    }
    if (qType === "FILL_IN_THE_BLANK" && acceptedAnswers.length === 0) {
      return {
        valid: false,
        error: `Question #${i + 1} (FILL_IN_THE_BLANK) needs at least one entry in "accepted_answers".`,
      };
    }
    if (
      qType === "TRUE_FALSE_NOT_GIVEN" &&
      !["TRUE", "FALSE", "NOT_GIVEN"].includes(
        String(q.correct_answer ?? "").toUpperCase()
      )
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (TRUE_FALSE_NOT_GIVEN) requires "correct_answer" to be "TRUE", "FALSE", or "NOT_GIVEN".`,
      };
    }
    if (qType === "MATCHING" && (!qData.pairs || qData.pairs.length === 0)) {
      return {
        valid: false,
        error: `Question #${i + 1} (MATCHING) requires "question_data.pairs".`,
      };
    }
    if (
      qType === "GAPPED_TEXT" &&
      (!qData.passages?.length || !qData.gapped_gaps?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (GAPPED_TEXT) requires "question_data.passages" and "question_data.gapped_gaps".`,
      };
    }
    if (
      qType === "INLINE_CLOZE" &&
      (!qData.text || !qData.inline_gaps?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (INLINE_CLOZE) requires "question_data.text" and "question_data.inline_gaps".`,
      };
    }
    if (
      qType === "WORD_BANK_CLOZE" &&
      (!qData.text || !qData.word_bank?.length || !qData.word_bank_gaps?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (WORD_BANK_CLOZE) requires "question_data.text", "word_bank", and "word_bank_gaps".`,
      };
    }
    if (
      qType === "SENTENCE_ORDERING" &&
      (!qData.segments || qData.segments.length < 2)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (SENTENCE_ORDERING) requires at least 2 items in "question_data.segments".`,
      };
    }
    if (
      qType === "ERROR_CORRECTION" &&
      (!qData.sentence || !qData.accepted_corrections?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (ERROR_CORRECTION) requires "question_data.sentence" and "question_data.accepted_corrections".`,
      };
    }
    if (
      qType === "KEY_WORD_TRANSFORMATION" &&
      (!qData.original_sentence ||
        !(qData.keyword || q.keyword) ||
        !(qData.accepted_answers?.length || acceptedAnswers.length))
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (KEY_WORD_TRANSFORMATION) requires "original_sentence", "keyword", and "accepted_answers".`,
      };
    }
    if (
      qType === "MULTIPLE_SELECT" &&
      (options.length < 3 || !qData.correct_answers?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (MULTIPLE_SELECT) requires at least 3 "options" and "question_data.correct_answers".`,
      };
    }
    if (
      qType === "CATEGORIZE" &&
      (!qData.categories?.length || !qData.items?.length)
    ) {
      return {
        valid: false,
        error: `Question #${i + 1} (CATEGORIZE) requires "question_data.categories" and "question_data.items".`,
      };
    }

    validatedQuestions.push({
      question_type: qType,
      prompt: q.prompt.trim(),
      options,
      correct_answer:
        typeof q.correct_answer === "string" ? q.correct_answer.trim() : null,
      accepted_answers: acceptedAnswers,
      keyword: typeof q.keyword === "string" ? q.keyword.trim() : null,
      min_words: typeof q.min_words === "number" ? q.min_words : null,
      max_words: typeof q.max_words === "number" ? q.max_words : null,
      image_url:
        typeof q.image_url === "string" && q.image_url.trim()
          ? q.image_url.trim()
          : null,
      question_data: qData,
      explanation:
        typeof q.explanation === "string" ? q.explanation.trim() : null,
    });
  }

  const rawPhases = Array.isArray(obj.phases) ? obj.phases : [];
  const validatedPhases: AssignmentPhase[] = [];
  for (let i = 0; i < rawPhases.length; i++) {
    const ph = rawPhases[i] as Record<string, unknown>;
    if (!ph || typeof ph !== "object") {
      return { valid: false, error: `Phase #${i + 1} must be an object.` };
    }
    const phMedia = (ph.media_type ?? "NONE") as MediaType;
    if (!VALID_MEDIA.includes(phMedia)) {
      return {
        valid: false,
        error: `Phase #${i + 1} has invalid "media_type".`,
      };
    }
    validatedPhases.push({
      id:
        typeof ph.id === "string" && ph.id.trim()
          ? ph.id.trim()
          : `phase-${i + 1}`,
      title:
        typeof ph.title === "string" && ph.title.trim()
          ? ph.title.trim()
          : `Part ${i + 1}`,
      instructions:
        typeof ph.instructions === "string" ? ph.instructions.trim() : "",
      media_type: phMedia,
      media_content:
        typeof ph.media_content === "string" && ph.media_content.trim()
          ? ph.media_content.trim()
          : null,
      start_time:
        typeof ph.start_time === "string" && ph.start_time.trim()
          ? ph.start_time.trim()
          : null,
      end_time:
        typeof ph.end_time === "string" && ph.end_time.trim()
          ? ph.end_time.trim()
          : null,
      audio_only: Boolean(ph.audio_only),
    });
  }

  return {
    valid: true,
    data: {
      title: obj.title.trim(),
      instructions:
        typeof obj.instructions === "string" ? obj.instructions.trim() : "",
      level: obj.level as ExamLevel,
      category: obj.category as AssignmentCategory,
      assignment_type: obj.assignment_type as AssignmentType,
      external_url:
        typeof obj.external_url === "string" && obj.external_url.trim()
          ? obj.external_url.trim()
          : null,
      media_type: mediaType,
      media_content:
        typeof obj.media_content === "string" && obj.media_content.trim()
          ? obj.media_content.trim()
          : null,
      media_start_time:
        typeof obj.media_start_time === "string" && obj.media_start_time.trim()
          ? obj.media_start_time.trim()
          : null,
      media_end_time:
        typeof obj.media_end_time === "string" && obj.media_end_time.trim()
          ? obj.media_end_time.trim()
          : null,
      media_audio_only: Boolean(obj.media_audio_only),
      phases: validatedPhases,
      is_published:
        typeof obj.is_published === "boolean" ? obj.is_published : true,
      questions: validatedQuestions,
    },
  };
}
