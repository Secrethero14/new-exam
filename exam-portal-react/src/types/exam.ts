export interface ExamIndexItem {
  "Tab ID": string;
  "Exam Name": string;
  "Category"?: string;
  "Total Time": string | number;
  "Total Marks"?: string | number;
  "Negative Mark"?: string | number;
  "Type"?: string;
  "Config"?: string;
  "Features"?: string;
  "Feedback"?: string;
}

export interface ExamParsedConfig {
  time: number;
  neg: number;
  totalMarks: number | null;
  name: string;
  type: string;
  config: {
    mode?: string;
    optional?: boolean;
    fixed?: string[];
    groups?: string[][];
  } | null;
  optional: boolean;
  fixed: string[];
  features: string;
}

export interface RawQuestion {
  originalIndex: number;
  "প্রশ্ন (LaTeX সহ)": string;
  "Subject"?: string;
  "Chapter"?: string;
  "অধ্যায়"?: string;
  "অপশন A"?: string;
  "অপশন B"?: string;
  "অপশন C"?: string;
  "অপশন D"?: string;
  "উত্তর"?: string;
  "বিস্তারিত ব্যাখ্যা (LaTeX সহ)"?: string;
}

export interface ChapterAnalysisItem {
  correct: number;
  total: number;
  subject: string;
}

export interface ExamResultRecord {
  id?: string;
  examName: string;
  examId: string;
  score: number;
  correct: number;
  wrong: number;
  timeTaken: number;
  markPerQuestion: number;
  negativeMark: number;
  student: string;
  email: string;
  analysis: Record<string, ChapterAnalysisItem>;
  userAnswers: Record<string | number, string | null>;
  isPractice: boolean;
  timestamp?: any;
}

export interface UserProfile {
  college?: string;
  batch?: string;
  phone?: string;
  email?: string;
  updatedAt?: any;
}
