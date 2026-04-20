import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { db } from "../db/database.js";
import { getCurrentQuestion, getOrCreateSession, getSessionProgress, getSessionQuestionDetail } from "../services/session-service.js";
import { requireAuth } from "../utils/auth.js";
import { nowIso } from "../utils/time.js";
import { verifyPassword } from "../utils/hash.js";

function mapQuestion(row: Record<string, unknown> | null, index: number, total: number) {
  if (!row) {
    return null;
  }

  const options = [
    { key: "A", text: String(row.option_a) },
    { key: "B", text: String(row.option_b) },
  ];

  if (row.option_c) options.push({ key: "C", text: String(row.option_c) });
  if (row.option_d) options.push({ key: "D", text: String(row.option_d) });

  return {
    questionId: row.id,
    sourceNo: row.source_no,
    category: row.category,
    questionType: row.question_type,
    stem: row.stem,
    options,
    index,
    total,
  };
}

function mapProgress(sessionId: string) {
  const progress = getSessionProgress(sessionId);
  if (!progress) {
    return null;
  }

  return {
    categoryFilter: progress.session.category_filter ?? null,
    currentIndex: Number(progress.session.current_index) + 1,
    answeredCount: Number(progress.session.answered_count),
    totalCount: Number(progress.session.total_count),
    items: progress.items,
  };
}

function updateWrongQuestion(userId: string, bankId: string, questionId: string, isCorrect: boolean) {
  const existing = db
    .prepare("SELECT * FROM wrong_questions WHERE user_id = ? AND bank_id = ? AND question_id = ?")
    .get(userId, bankId, questionId) as Record<string, unknown> | undefined;

  const now = nowIso();
  if (!isCorrect) {
    if (existing) {
      db.prepare(`
        UPDATE wrong_questions
        SET last_wrong_at = ?, wrong_count = wrong_count + 1, is_mastered = 0, mastered_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(now, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO wrong_questions (
          id, user_id, bank_id, question_id, first_wrong_at, last_wrong_at, wrong_count,
          is_mastered, mastered_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
      `).run(nanoid(), userId, bankId, questionId, now, now, 1, now, now);
    }
    return;
  }

  if (existing) {
    db.prepare(`
      UPDATE wrong_questions
      SET is_mastered = 1, mastered_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, existing.id);
  }
}

export async function registerAppRoutes(app: FastifyInstance) {
  app.post("/api/app/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'user'").get(body.username ?? "") as Record<string, unknown> | undefined;

    if (!user || user.status !== "enabled" || !verifyPassword(body.password ?? "", String(user.password_hash))) {
      return reply.code(401).send({ message: "账号或密码错误" });
    }

    db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), user.id);
    const token = await reply.jwtSign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
      },
    };
  });

  app.get("/api/app/question-banks", { preHandler: requireAuth }, async (request) => {
    const rows = db
      .prepare(`
        SELECT id, name, version, total_count, single_count, judge_count, category_count
        FROM question_banks
        WHERE status = 'published'
        ORDER BY published_at DESC, created_at DESC
      `)
      .all() as Record<string, unknown>[];

    return rows.map((row) => {
      const unresolvedWrongCount = db
        .prepare("SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ? AND bank_id = ? AND is_mastered = 0")
        .get(request.user.id, row.id) as { count: number };
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        totalCount: row.total_count,
        singleCount: row.single_count,
        judgeCount: row.judge_count,
        categoryCount: row.category_count,
        unresolvedWrongCount: unresolvedWrongCount.count,
      };
    });
  });

  app.get("/api/app/question-banks/:id/summary", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ? AND status = 'published'").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在或未发布" });
    }
    const categories = db
      .prepare(`
        SELECT category, COUNT(*) as count
        FROM questions
        WHERE bank_id = ?
        GROUP BY category
        ORDER BY count DESC
      `)
      .all(params.id);
    const unresolvedWrong = db
      .prepare("SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ? AND bank_id = ? AND is_mastered = 0")
      .get(request.user.id, params.id) as { count: number };

    return {
      id: bank.id,
      name: bank.name,
      version: bank.version,
      totalCount: bank.total_count,
      singleCount: bank.single_count,
      judgeCount: bank.judge_count,
      categories,
      unresolvedWrongCount: unresolvedWrong.count,
    };
  });

  app.get("/api/app/practice-sessions/latest", { preHandler: requireAuth }, async (request) => {
    const query = request.query as { bankId?: string; mode?: "normal" | "wrong_only"; category?: string };
    const session = db
      .prepare(`
        SELECT *
        FROM practice_sessions
        WHERE user_id = ? AND bank_id = ? AND mode = ? AND status = 'in_progress' AND COALESCE(category_filter, '') = ?
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(request.user.id, query.bankId ?? "", query.mode ?? "normal", query.category?.trim() ?? "");
    return { session };
  });

  app.post("/api/app/practice-sessions", { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body as { bankId?: string; mode?: "normal" | "wrong_only"; category?: string };
    if (!body.bankId || !body.mode) {
      return reply.code(400).send({ message: "缺少题库或练习模式" });
    }
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ? AND status = 'published'").get(body.bankId) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在或未发布" });
    }
    const category = body.category?.trim() || "";
    const session = getOrCreateSession(request.user.id, body.bankId, body.mode, category);
    if (!session) {
      return reply.code(400).send({ message: category ? "当前分类下暂无可练习题目" : "当前暂无可练习题目" });
    }
    const current = getCurrentQuestion(String(session.id));
    return {
      sessionId: session.id,
      totalCount: session.total_count,
      categoryFilter: session.category_filter ?? null,
      question: mapQuestion((current?.question as Record<string, unknown>) ?? null, Number(current?.sortNo ?? 0), Number(session.total_count)),
      progress: mapProgress(String(session.id)),
      resumed: Number(session.answered_count) > 0,
    };
  });

  app.post("/api/app/wrong-practice-sessions", { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body as { bankId?: string };
    const unresolved = db
      .prepare("SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ? AND bank_id = ? AND is_mastered = 0")
      .get(request.user.id, body.bankId ?? "") as { count: number };
    if (!body.bankId || unresolved.count === 0) {
      return reply.code(400).send({ message: "当前没有待练习错题" });
    }
    const session = getOrCreateSession(request.user.id, body.bankId, "wrong_only");
    if (!session) {
      return reply.code(400).send({ message: "当前没有待练习错题" });
    }
    const current = getCurrentQuestion(String(session.id));
    return {
      sessionId: session.id,
      totalCount: session.total_count,
      categoryFilter: session.category_filter ?? null,
      question: mapQuestion((current?.question as Record<string, unknown>) ?? null, Number(current?.sortNo ?? 0), Number(session.total_count)),
      progress: mapProgress(String(session.id)),
      resumed: Number(session.answered_count) > 0,
    };
  });

  app.get("/api/app/practice-sessions/:id/current", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const current = getCurrentQuestion(params.id);
    if (!current || current.session.user_id !== request.user.id) {
      return reply.code(404).send({ message: "练习不存在" });
    }
    return {
      session: current.session,
      question: mapQuestion((current.question as Record<string, unknown>) ?? null, Number(current.sortNo ?? 0), Number(current.session.total_count)),
      progress: mapProgress(params.id),
    };
  });

  app.get("/api/app/practice-sessions/:id/progress", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?").get(params.id, request.user.id) as Record<string, unknown> | undefined;
    if (!session) {
      return reply.code(404).send({ message: "练习不存在" });
    }

    return {
      sessionId: session.id,
      progress: mapProgress(params.id),
    };
  });

  app.get("/api/app/practice-sessions/:id/questions/:questionId", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string; questionId: string };
    const detail = getSessionQuestionDetail(params.id, params.questionId);
    if (!detail || detail.session.user_id !== request.user.id) {
      return reply.code(404).send({ message: "题目记录不存在" });
    }

    const row = detail.detail;
    const question = mapQuestion(
      {
        id: row.id,
        source_no: row.source_no,
        category: row.category,
        question_type: row.question_type,
        stem: row.stem,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
      } as Record<string, unknown>,
      Number(row.sort_no),
      Number(detail.session.total_count),
    );

    return {
      question,
      questionId: row.id,
      sortNo: row.sort_no,
      sourceNo: row.source_no,
      userAnswer: row.user_answer,
      correctAnswer: row.correct_answer,
      isCorrect: row.is_correct == null ? null : Number(row.is_correct) === 1,
      answeredAt: row.answered_at,
    };
  });

  app.post("/api/app/practice-sessions/:id/answer", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { questionId?: string; userAnswer?: string; durationSeconds?: number };
    const current = getCurrentQuestion(params.id);

    if (!current || current.session.user_id !== request.user.id || !current.question) {
      return reply.code(404).send({ message: "当前题目不存在" });
    }

    if (body.questionId !== current.question.id) {
      return reply.code(400).send({ message: "题目顺序不匹配，请刷新后重试" });
    }

    const activeQuestion = current.question as Record<string, unknown>;
    const correctAnswer = String(activeQuestion.correct_answer);
    const isCorrect = body.userAnswer === correctAnswer;
    const now = nowIso();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO answer_records (
          id, session_id, user_id, bank_id, question_id, question_type, user_answer, correct_answer,
          is_correct, duration_seconds, answered_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nanoid(),
        params.id,
        request.user.id,
        current.session.bank_id,
        activeQuestion.id,
        activeQuestion.question_type,
        body.userAnswer ?? "",
        correctAnswer,
        isCorrect ? 1 : 0,
        Number(body.durationSeconds ?? 0),
        now,
        now,
      );

      updateWrongQuestion(request.user.id, String(current.session.bank_id), String(activeQuestion.id), isCorrect);

      const answeredCount = Number(current.session.answered_count) + 1;
      const correctCount = Number(current.session.correct_count) + (isCorrect ? 1 : 0);
      const wrongCount = Number(current.session.wrong_count) + (isCorrect ? 0 : 1);
      const finished = answeredCount >= Number(current.session.total_count);

      db.prepare(`
        UPDATE practice_sessions
        SET answered_count = ?, correct_count = ?, wrong_count = ?, current_index = ?, last_question_id = ?,
            last_answer = ?, last_is_correct = ?, status = ?, submitted_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        answeredCount,
        correctCount,
        wrongCount,
        answeredCount,
        activeQuestion.id,
        body.userAnswer ?? "",
        isCorrect ? 1 : 0,
        finished ? "completed" : "in_progress",
        finished ? now : null,
        now,
        params.id,
      );
    });

    tx();

    const next = getCurrentQuestion(params.id);
    return {
      isCorrect,
      correctAnswer,
      completed: next?.question == null,
      progress: mapProgress(params.id),
      nextQuestion: next?.question
        ? mapQuestion(next.question as Record<string, unknown>, Number(next.sortNo ?? 0), Number(next.session.total_count))
        : null,
    };
  });

  app.post("/api/app/practice-sessions/:id/submit", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?").get(params.id, request.user.id) as Record<string, unknown> | undefined;
    if (!session) {
      return reply.code(404).send({ message: "练习不存在" });
    }
    const now = nowIso();
    db.prepare("UPDATE practice_sessions SET status = 'completed', submitted_at = ?, updated_at = ? WHERE id = ?").run(now, now, params.id);
    const updated = db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(params.id) as Record<string, unknown>;
    return updated;
  });

  app.get("/api/app/practice-sessions/history", { preHandler: requireAuth }, async (request) => {
    const rows = db
      .prepare(`
        SELECT
          s.id, s.mode, s.status, s.total_count, s.answered_count, s.correct_count, s.wrong_count,
          s.started_at, s.submitted_at, b.name as bank_name, b.version as bank_version, b.id as bank_id
        FROM practice_sessions s
        JOIN question_banks b ON b.id = s.bank_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `)
      .all(request.user.id);
    return rows;
  });

  app.post("/api/app/practice-sessions/history/clear", { preHandler: requireAuth }, async (request) => {
    const sessionRows = db
      .prepare("SELECT id FROM practice_sessions WHERE user_id = ?")
      .all(request.user.id) as Array<{ id: string }>;

    const tx = db.transaction(() => {
      for (const session of sessionRows) {
        db.prepare("DELETE FROM session_questions WHERE session_id = ?").run(session.id);
      }
      db.prepare("DELETE FROM answer_records WHERE user_id = ?").run(request.user.id);
      db.prepare("DELETE FROM practice_sessions WHERE user_id = ?").run(request.user.id);
      db.prepare("DELETE FROM wrong_questions WHERE user_id = ?").run(request.user.id);
    });

    tx();
    return { success: true };
  });

  app.get("/api/app/wrong-questions", { preHandler: requireAuth }, async (request) => {
    const query = request.query as { bankId?: string };
    const rows = db
      .prepare(`
        SELECT
          w.id, w.wrong_count, w.last_wrong_at, w.is_mastered, q.id as question_id, q.category, q.stem,
          q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer
        FROM wrong_questions w
        JOIN questions q ON q.id = w.question_id
        WHERE w.user_id = ? AND w.bank_id = ? AND w.is_mastered = 0
        ORDER BY w.last_wrong_at DESC
      `)
      .all(request.user.id, query.bankId ?? "") as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id,
      wrongCount: row.wrong_count,
      lastWrongAt: row.last_wrong_at,
      question: mapQuestion(
        {
          id: row.question_id,
          category: row.category,
          question_type: row.option_c ? "single" : "judge",
          stem: row.stem,
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
        } as Record<string, unknown>,
        0,
        0,
      ),
      correctAnswer: row.correct_answer,
    }));
  });
}
