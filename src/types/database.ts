export type UserRole = "student" | "admin";
export type ExamLevel = "B2_FIRST" | "C1_ADVANCED";
export type AssignmentCategory =
  | "READING"
  | "LISTENING"
  | "WRITING"
  | "VOCABULARY"
  | "GRAMMAR"
  | "USE_OF_ENGLISH";
export type AssignmentType = "EXTERNAL_LINK" | "INTERACTIVE_EXERCISE";
export type MediaType =
  | "NONE"
  | "READING_PASSAGE"
  | "VIDEO_URL"
  | "AUDIO_MP4_UPLOAD";
export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "FILL_IN_THE_BLANK"
  | "OPEN_ENDED"
  | "TRUE_FALSE_NOT_GIVEN"
  | "MATCHING"
  | "GAPPED_TEXT"
  | "INLINE_CLOZE"
  | "WORD_BANK_CLOZE"
  | "SENTENCE_ORDERING"
  | "ERROR_CORRECTION"
  | "KEY_WORD_TRANSFORMATION"
  | "MULTIPLE_SELECT"
  | "CATEGORIZE"
  | "SPEAKING_RECORDING";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  MULTIPLE_SELECT: "Multiple Select (Choose 2–3)",
  FILL_IN_THE_BLANK: "Fill in the Blank",
  KEY_WORD_TRANSFORMATION: "Key Word Transformation (Part 4)",
  OPEN_ENDED: "Open-Ended Writing",
  SPEAKING_RECORDING: "Speaking Recording (Audio)",
  TRUE_FALSE_NOT_GIVEN: "True / False / Not Given",
  MATCHING: "Matching (Paragraphs / Synonyms)",
  GAPPED_TEXT: "Gapped Text (Paragraph Filling)",
  INLINE_CLOZE: "Inline Cloze (Dropdown Gaps)",
  WORD_BANK_CLOZE: "Word Bank Cloze",
  CATEGORIZE: "Categorize / Sort into Buckets",
  SENTENCE_ORDERING: "Sentence Ordering",
  ERROR_CORRECTION: "Error Correction",
};

export interface MatchingPair {
  id: string;
  prompt: string;
  match: string;
}

export interface GappedTextOption {
  label: string;
  text: string;
}

export interface GappedTextGap {
  id: string;
  correct_label: string;
}

export interface InlineClozeGap {
  id: string;
  options: string[];
  correct_answer: string;
}

export interface WordBankGap {
  id: string;
  correct_answer: string;
}

export interface CategorizeItem {
  id: string;
  text: string;
  correct_category: string;
}

export interface QuestionData {
  // Optional phase assignment for multi-phase Listening / Exam tasks
  phase_id?: string | null;
  // MATCHING
  pairs?: MatchingPair[];
  distractors?: string[];
  // GAPPED_TEXT
  passages?: GappedTextOption[];
  gapped_gaps?: GappedTextGap[];
  // INLINE_CLOZE & WORD_BANK_CLOZE
  text?: string;
  inline_gaps?: InlineClozeGap[];
  word_bank?: string[];
  word_bank_gaps?: WordBankGap[];
  // SENTENCE_ORDERING
  segments?: string[];
  // ERROR_CORRECTION
  sentence?: string;
  error_text?: string;
  accepted_corrections?: string[];
  // KEY_WORD_TRANSFORMATION (Cambridge Use of English Part 4 — 2 pts with partial credit)
  original_sentence?: string;
  keyword?: string;
  prefix_text?: string;
  suffix_text?: string;
  min_words?: number;
  max_words?: number;
  accepted_answers?: string[];
  half_credit_parts?: [string, string] | string[];
  // MULTIPLE_SELECT (Choose 2–3 correct answers)
  correct_answers?: string[];
  required_count?: number;
  // CATEGORIZE (Sort words/phrases into 2–3 buckets)
  categories?: string[];
  items?: CategorizeItem[];
  // SPEAKING_RECORDING (Browser audio recording for teacher review)
  min_seconds?: number;
  max_seconds?: number;
}
export type SubmissionStatus = "COMPLETED" | "PENDING_REVIEW" | "GRADED";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  selected_level: ExamLevel | null;
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  level: ExamLevel;
  step_number: number;
  title: string;
  description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignmentPhase {
  id: string;
  title: string;
  instructions?: string;
  media_type: MediaType;
  media_content?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  audio_only?: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  level: ExamLevel;
  category: AssignmentCategory;
  assignment_type: AssignmentType;
  external_url: string | null;
  media_type: MediaType;
  media_content: string | null;
  media_start_time?: string | null;
  media_end_time?: string | null;
  media_audio_only?: boolean;
  phases?: AssignmentPhase[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepAssignment {
  id: string;
  step_id: string;
  assignment_id: string;
  order_index: number;
  created_at: string;
  assignment?: Assignment;
}

export interface Question {
  id: string;
  assignment_id: string;
  order_index: number;
  question_type: QuestionType;
  prompt: string;
  options: string[];
  correct_answer: string | null;
  accepted_answers: string[];
  keyword: string | null;
  min_words: number | null;
  max_words: number | null;
  image_url?: string | null;
  question_data?: QuestionData | null;
  explanation: string | null;
  created_at: string;
}

export interface AnswerEntry {
  answer: string;
  is_correct?: boolean | null;
  word_count?: number;
  item_results?: Record<string, boolean>;
  points_earned?: number;
  points_possible?: number;
}

export interface Submission {
  id: string;
  user_id: string;
  assignment_id: string;
  step_id: string | null;
  status: SubmissionStatus;
  raw_score_input: string | null;
  percentage_score: number | null;
  answers: Record<string, AnswerEntry>;
  admin_feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export const EXAM_LEVEL_LABELS: Record<ExamLevel, string> = {
  B2_FIRST: "B2 First",
  C1_ADVANCED: "C1 Advanced",
};

export const EXAM_LEVEL_DESCRIPTIONS: Record<ExamLevel, string> = {
  B2_FIRST: "Upper-Intermediate (FCE) — Independent everyday & academic English",
  C1_ADVANCED: "Advanced (CAE) — High-level professional & university English",
};

export const CATEGORY_LABELS: Record<AssignmentCategory, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  VOCABULARY: "Vocabulary",
  GRAMMAR: "Grammar",
  USE_OF_ENGLISH: "Use of English",
};

export const ALL_CATEGORIES: AssignmentCategory[] = [
  "READING",
  "USE_OF_ENGLISH",
  "LISTENING",
  "WRITING",
  "GRAMMAR",
  "VOCABULARY",
];

export const CATEGORY_COLORS: Record<
  AssignmentCategory,
  { bg: string; text: string; border: string; hex: string }
> = {
  READING: {
    bg: "bg-[#2B4C7E]",
    text: "text-white",
    border: "border-[#2B4C7E]",
    hex: "#2B4C7E",
  },
  LISTENING: {
    bg: "bg-[#5C5470]",
    text: "text-white",
    border: "border-[#5C5470]",
    hex: "#5C5470",
  },
  WRITING: {
    bg: "bg-[#8C5A3C]",
    text: "text-white",
    border: "border-[#8C5A3C]",
    hex: "#8C5A3C",
  },
  VOCABULARY: {
    bg: "bg-[#3E6B52]",
    text: "text-white",
    border: "border-[#3E6B52]",
    hex: "#3E6B52",
  },
  GRAMMAR: {
    bg: "bg-[#8B3A3A]",
    text: "text-white",
    border: "border-[#8B3A3A]",
    hex: "#8B3A3A",
  },
  USE_OF_ENGLISH: {
    bg: "bg-[#4A5568]",
    text: "text-white",
    border: "border-[#4A5568]",
    hex: "#4A5568",
  },
};
