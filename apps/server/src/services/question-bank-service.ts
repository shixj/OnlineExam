import { nanoid } from "nanoid";
import { ImportPreviewQuestion } from "@online-exam/shared";
import { db } from "../db/database.js";
import { nowIso } from "../utils/time.js";

export function refreshQuestionBankStats(bankId: string) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN question_type = 'single' THEN 1 ELSE 0 END) as single_count,
      SUM(CASE WHEN question_type = 'judge' THEN 1 ELSE 0 END) as judge_count,
      COUNT(DISTINCT category) as category_count
    FROM questions
    WHERE bank_id = ?
  `).get(bankId) as {
    total_count: number;
    single_count: number | null;
    judge_count: number | null;
    category_count: number;
  };

  db.prepare(`
    UPDATE question_banks
    SET total_count = ?, single_count = ?, judge_count = ?, category_count = ?, updated_at = ?
    WHERE id = ?
  `).run(
    Number(stats.total_count ?? 0),
    Number(stats.single_count ?? 0),
    Number(stats.judge_count ?? 0),
    Number(stats.category_count ?? 0),
    nowIso(),
    bankId,
  );
}

export function createQuestionBankFromImport(params: {
  bankName: string;
  bankVersion: string;
  questions: ImportPreviewQuestion[];
  importedBy: string;
}) {
  const { bankName, bankVersion, questions, importedBy } = params;
  const now = nowIso();
  const bankId = nanoid();

  const singleCount = questions.filter((item) => item.questionType === "single").length;
  const judgeCount = questions.filter((item) => item.questionType === "judge").length;
  const categoryCount = new Set(questions.map((item) => item.category)).size;

  const insertBank = db.prepare(`
    INSERT INTO question_banks (
      id, name, version, status, total_count, single_count, judge_count, category_count,
      imported_by, imported_at, published_by, published_at, created_at, updated_at
    ) VALUES (
      @id, @name, @version, @status, @total_count, @single_count, @judge_count, @category_count,
      @imported_by, @imported_at, @published_by, @published_at, @created_at, @updated_at
    )
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (
      id, bank_id, category, question_type, source_no, stem, option_a, option_b, option_c, option_d,
      correct_answer, sort_no, is_active, created_at, updated_at
    ) VALUES (
      @id, @bank_id, @category, @question_type, @source_no, @stem, @option_a, @option_b, @option_c, @option_d,
      @correct_answer, @sort_no, @is_active, @created_at, @updated_at
    )
  `);

  const transaction = db.transaction(() => {
    insertBank.run({
      id: bankId,
      name: bankName,
      version: bankVersion,
      status: "imported",
      total_count: questions.length,
      single_count: singleCount,
      judge_count: judgeCount,
      category_count: categoryCount,
      imported_by: importedBy,
      imported_at: now,
      published_by: null,
      published_at: null,
      created_at: now,
      updated_at: now,
    });

    questions.forEach((question, index) => {
      insertQuestion.run({
        id: nanoid(),
        bank_id: bankId,
        category: question.category,
        question_type: question.questionType,
        source_no: question.sourceNo,
        stem: question.stem,
        option_a: question.optionA,
        option_b: question.optionB,
        option_c: question.optionC,
        option_d: question.optionD,
        correct_answer: question.correctAnswer,
        sort_no: index + 1,
        is_active: 1,
        created_at: now,
        updated_at: now,
      });
    });
  });

  transaction();
  return bankId;
}

export function createQuestion(params: {
  bankId: string;
  category: string;
  questionType: "single" | "judge";
  sourceNo?: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer: string;
}) {
  const now = nowIso();
  const questionId = nanoid();
  const nextSort = db.prepare("SELECT COALESCE(MAX(sort_no), 0) + 1 as nextSort FROM questions WHERE bank_id = ?")
    .get(params.bankId) as { nextSort: number };

  db.prepare(`
    INSERT INTO questions (
      id, bank_id, category, question_type, source_no, stem, option_a, option_b, option_c, option_d,
      correct_answer, sort_no, is_active, created_at, updated_at
    ) VALUES (
      @id, @bank_id, @category, @question_type, @source_no, @stem, @option_a, @option_b, @option_c, @option_d,
      @correct_answer, @sort_no, @is_active, @created_at, @updated_at
    )
  `).run({
    id: questionId,
    bank_id: params.bankId,
    category: params.category,
    question_type: params.questionType,
    source_no: params.sourceNo ?? null,
    stem: params.stem,
    option_a: params.optionA,
    option_b: params.optionB,
    option_c: params.optionC ?? null,
    option_d: params.optionD ?? null,
    correct_answer: params.correctAnswer,
    sort_no: Number(nextSort.nextSort ?? 1),
    is_active: 1,
    created_at: now,
    updated_at: now,
  });

  refreshQuestionBankStats(params.bankId);
  return questionId;
}

export function updateQuestion(params: {
  questionId: string;
  bankId: string;
  category: string;
  questionType: "single" | "judge";
  sourceNo?: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer: string;
}) {
  db.prepare(`
    UPDATE questions
    SET category = ?, question_type = ?, source_no = ?, stem = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
        correct_answer = ?, updated_at = ?
    WHERE id = ? AND bank_id = ?
  `).run(
    params.category,
    params.questionType,
    params.sourceNo ?? null,
    params.stem,
    params.optionA,
    params.optionB,
    params.optionC ?? null,
    params.optionD ?? null,
    params.correctAnswer,
    nowIso(),
    params.questionId,
    params.bankId,
  );

  refreshQuestionBankStats(params.bankId);
}

export function deleteQuestion(bankId: string, questionId: string) {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM session_questions WHERE question_id = ?").run(questionId);
    db.prepare("DELETE FROM answer_records WHERE question_id = ?").run(questionId);
    db.prepare("DELETE FROM wrong_questions WHERE question_id = ?").run(questionId);
    db.prepare("DELETE FROM questions WHERE id = ? AND bank_id = ?").run(questionId, bankId);
    db.prepare(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_no ASC, created_at ASC) as next_sort_no
        FROM questions
        WHERE bank_id = ?
      )
      UPDATE questions
      SET sort_no = (
        SELECT next_sort_no FROM ordered WHERE ordered.id = questions.id
      )
      WHERE bank_id = ?
    `).run(bankId, bankId);
    refreshQuestionBankStats(bankId);
  });
  tx();
}
