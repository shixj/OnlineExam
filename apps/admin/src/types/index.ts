export type AdminUser = {
  id: string;
  username: string;
  realName: string;
  phone: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type QuestionBank = {
  id: string;
  name: string;
  version: string;
  status: string;
  totalCount: number;
  singleCount: number;
  judgeCount: number;
  categoryCount: number;
  importedAt: string | null;
  publishedAt: string | null;
};

export type ImportJob = {
  jobId: string;
  bankName: string;
  bankVersion: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: { row: number; column: string; message: string }[];
  preview: {
    category: string;
    questionType: string;
    sourceNo: string | null;
    stem: string;
    correctAnswer: string;
  }[];
  canImport: boolean;
};

export type PracticeSession = {
  id: string;
  username: string;
  real_name: string;
  bank_name: string;
  bank_version: string;
  mode: string;
  status: string;
  total_count: number;
  answered_count: number;
  correct_count: number;
  wrong_count: number;
  started_at: string;
  submitted_at: string | null;
};

export type BankDetail = {
  id: string;
  name: string;
  version: string;
  status: string;
  totalCount: number;
  questions: {
    id: string;
    category: string;
    question_type: string;
    source_no: string | null;
    stem: string;
    option_a: string;
    option_b: string;
    option_c: string | null;
    option_d: string | null;
    correct_answer: string;
    sort_no?: number;
  }[];
  categories: { category: string; count: number }[];
};

export type AuthState = {
  token: string;
  user: { id: string; username: string; realName: string; role: string };
};
