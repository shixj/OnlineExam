export type AuthState = {
  token: string;
  user: {
    id: string;
    username: string;
    realName: string;
    role: string;
  };
};

export type BankItem = {
  id: string;
  name: string;
  version: string;
  totalCount: number;
  singleCount: number;
  judgeCount: number;
  categoryCount: number;
  unresolvedWrongCount: number;
};

export type BankSummary = {
  id: string;
  name: string;
  version: string;
  totalCount: number;
  singleCount: number;
  judgeCount: number;
  unresolvedWrongCount: number;
  categories: { category: string; count: number }[];
};

export type QuestionPayload = {
  questionId: string;
  sourceNo?: string | null;
  category: string;
  questionType: string;
  stem: string;
  options: { key: string; text: string }[];
  index: number;
  total: number;
};

export type SessionProgressItem = {
  questionId: string;
  sortNo: number;
  sourceNo: string | null;
  category: string;
  label: string | number;
  status: "pending" | "correct" | "wrong";
  userAnswer: string | null;
  correctAnswer: string | null;
};

export type SessionProgress = {
  categoryFilter: string | null;
  currentIndex: number;
  answeredCount: number;
  totalCount: number;
  items: SessionProgressItem[];
};

export type SessionQuestionReview = {
  question: QuestionPayload;
  questionId: string;
  sortNo: number;
  sourceNo: string | null;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  answeredAt: string | null;
};

export type SessionResult = {
  id: string;
  total_count: number;
  answered_count: number;
  correct_count: number;
  wrong_count: number;
  status: string;
};

export type HistoryItem = {
  id: string;
  bank_name: string;
  bank_version: string;
  bank_id: string;
  mode: string;
  status: string;
  total_count: number;
  answered_count: number;
  correct_count: number;
  wrong_count: number;
  started_at: string;
  submitted_at: string | null;
};

export type WrongItem = {
  id: string;
  wrongCount: number;
  lastWrongAt: string;
  correctAnswer: string;
  question: QuestionPayload;
};
