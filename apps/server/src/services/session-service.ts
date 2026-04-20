import { nanoid } from "nanoid";
import { SessionMode } from "@online-exam/shared";
import { db } from "../db/database.js";
import { nowIso } from "../utils/time.js";

function normalizeCategoryFilter(categoryFilter?: string | null) {
  return categoryFilter?.trim() ?? "";
}

function buildQuestionSet(bankId: string, mode: SessionMode, userId: string, categoryFilter?: string | null): { id: string }[] {
  if (mode === "wrong_only") {
    return db
      .prepare(`
        SELECT q.id
        FROM wrong_questions w
        JOIN questions q ON q.id = w.question_id
        WHERE w.user_id = ? AND w.bank_id = ? AND w.is_mastered = 0
        ORDER BY q.sort_no ASC
      `)
      .all(userId, bankId) as { id: string }[];
  }

  const normalizedCategory = normalizeCategoryFilter(categoryFilter);
  if (normalizedCategory) {
    return db
      .prepare(`
        SELECT id
        FROM questions
        WHERE bank_id = ? AND is_active = 1 AND category = ?
        ORDER BY sort_no ASC
      `)
      .all(bankId, normalizedCategory) as { id: string }[];
  }

  return db
    .prepare(`
      SELECT id
      FROM questions
      WHERE bank_id = ? AND is_active = 1
      ORDER BY sort_no ASC
    `)
    .all(bankId) as { id: string }[];
}

export function getOrCreateSession(userId: string, bankId: string, mode: SessionMode, categoryFilter?: string | null) {
  const normalizedCategory = normalizeCategoryFilter(categoryFilter);
  const existing = db
    .prepare(`
      SELECT *
      FROM practice_sessions
      WHERE user_id = ? AND bank_id = ? AND mode = ? AND status = 'in_progress' AND COALESCE(category_filter, '') = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(userId, bankId, mode, normalizedCategory) as Record<string, unknown> | undefined;

  if (existing) {
    return existing;
  }

  const questionSet = buildQuestionSet(bankId, mode, userId, normalizedCategory);
  if (questionSet.length === 0) {
    return null;
  }
  const now = nowIso();
  const sessionId = nanoid();

  const insertSession = db.prepare(`
    INSERT INTO practice_sessions (
      id, user_id, bank_id, mode, status, total_count, answered_count, correct_count, wrong_count, current_index,
      category_filter, last_question_id, last_answer, last_is_correct, started_at, submitted_at, created_at, updated_at
    ) VALUES (
      @id, @user_id, @bank_id, @mode, @status, @total_count, @answered_count, @correct_count, @wrong_count, @current_index,
      @category_filter, @last_question_id, @last_answer, @last_is_correct, @started_at, @submitted_at, @created_at, @updated_at
    )
  `);

  const insertSessionQuestion = db.prepare(`
    INSERT INTO session_questions (id, session_id, question_id, sort_no)
    VALUES (@id, @session_id, @question_id, @sort_no)
  `);

  const tx = db.transaction(() => {
    insertSession.run({
      id: sessionId,
      user_id: userId,
      bank_id: bankId,
      mode,
      status: "in_progress",
      total_count: questionSet.length,
      answered_count: 0,
      correct_count: 0,
      wrong_count: 0,
      current_index: 0,
      category_filter: normalizedCategory || null,
      last_question_id: null,
      last_answer: null,
      last_is_correct: null,
      started_at: now,
      submitted_at: null,
      created_at: now,
      updated_at: now,
    });

    questionSet.forEach((question, index) => {
      insertSessionQuestion.run({
        id: nanoid(),
        session_id: sessionId,
        question_id: question.id,
        sort_no: index + 1,
      });
    });
  });

  tx();

  return db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(sessionId) as Record<string, unknown>;
}

export function getCurrentQuestion(sessionId: string) {
  const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(sessionId) as Record<string, unknown> | undefined;
  if (!session) {
    return null;
  }

  const currentIndex = Number(session.current_index) + 1;
  const sessionQuestion = db
    .prepare("SELECT question_id, sort_no FROM session_questions WHERE session_id = ? AND sort_no = ?")
    .get(sessionId, currentIndex) as { question_id: string; sort_no: number } | undefined;

  if (!sessionQuestion) {
    return { session, question: null };
  }

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(sessionQuestion.question_id) as Record<string, unknown> | undefined;
  return { session, question, sortNo: sessionQuestion.sort_no };
}

export function getSessionProgress(sessionId: string) {
  const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(sessionId) as Record<string, unknown> | undefined;
  if (!session) {
    return null;
  }

  const items = db
    .prepare(`
      SELECT
        sq.question_id,
        sq.sort_no,
        q.source_no,
        q.category,
        ar.user_answer,
        ar.correct_answer,
        ar.is_correct
      FROM session_questions sq
      JOIN questions q ON q.id = sq.question_id
      LEFT JOIN answer_records ar ON ar.session_id = sq.session_id AND ar.question_id = sq.question_id
      WHERE sq.session_id = ?
      ORDER BY sq.sort_no ASC
    `)
    .all(sessionId) as Array<Record<string, unknown>>;

  return {
    session,
    items: items.map((item) => ({
      questionId: item.question_id,
      sortNo: item.sort_no,
      sourceNo: item.source_no,
      category: item.category,
      label: item.source_no || item.sort_no,
      status: item.user_answer ? (Number(item.is_correct) === 1 ? "correct" : "wrong") : "pending",
      userAnswer: item.user_answer,
      correctAnswer: item.correct_answer,
    })),
  };
}

export function getSessionQuestionDetail(sessionId: string, questionId: string) {
  const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(sessionId) as Record<string, unknown> | undefined;
  if (!session) {
    return null;
  }

  const row = db
    .prepare(`
      SELECT
        sq.sort_no,
        q.id,
        q.source_no,
        q.category,
        q.question_type,
        q.stem,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        ar.user_answer,
        ar.is_correct,
        ar.answered_at
      FROM session_questions sq
      JOIN questions q ON q.id = sq.question_id
      LEFT JOIN answer_records ar ON ar.session_id = sq.session_id AND ar.question_id = sq.question_id
      WHERE sq.session_id = ? AND sq.question_id = ?
      LIMIT 1
    `)
    .get(sessionId, questionId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    session,
    detail: row,
  };
}
