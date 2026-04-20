export const QUESTION_TYPES = ["judge", "single"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const USER_STATUSES = ["enabled", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const BANK_STATUSES = ["draft", "imported", "published", "disabled"] as const;
export type BankStatus = (typeof BANK_STATUSES)[number];

export const IMPORT_JOB_STATUSES = ["pending", "validating", "success", "failed"] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const SESSION_MODES = ["normal", "wrong_only"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const SESSION_STATUSES = ["in_progress", "completed", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const JUDGE_OPTION_A = "正确";
export const JUDGE_OPTION_B = "错误";

export const EXCEL_HEADERS = [
  "题库名称",
  "题库版本",
  "分类",
  "题型",
  "题号",
  "题干",
  "选项A",
  "选项B",
  "选项C",
  "选项D",
  "正确答案",
] as const;

export type ExcelHeader = (typeof EXCEL_HEADERS)[number];

export interface UserRecord {
  id: string;
  username: string;
  realName: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankRecord {
  id: string;
  name: string;
  version: string;
  status: BankStatus;
  totalCount: number;
  singleCount: number;
  judgeCount: number;
  categoryCount: number;
  importedBy: string | null;
  importedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  id: string;
  bankId: string;
  category: string;
  questionType: QuestionType;
  sourceNo: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: "A" | "B" | "C" | "D";
  sortNo: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportErrorItem {
  row: number;
  column: string;
  message: string;
}

export interface ImportPreviewQuestion {
  category: string;
  questionType: QuestionType;
  sourceNo: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: "A" | "B" | "C" | "D";
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    realName: string;
    role: UserRole;
  };
}
