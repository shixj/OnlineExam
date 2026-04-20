import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { buildTemplateBuffer, parseImportFile } from "../services/import-service.js";
import { createQuestion, createQuestionBankFromImport, deleteQuestion, refreshQuestionBankStats, updateQuestion } from "../services/question-bank-service.js";
import { db } from "../db/database.js";
import { requireAdmin } from "../utils/auth.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { nowIso } from "../utils/time.js";

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    username: row.username,
    realName: row.real_name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

function mapBank(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    status: row.status,
    totalCount: row.total_count,
    singleCount: row.single_count,
    judgeCount: row.judge_count,
    categoryCount: row.category_count,
    importedAt: row.imported_at,
    publishedAt: row.published_at,
  };
}

function validateQuestionPayload(body: Record<string, unknown> | undefined) {
  const questionType = String(body?.questionType ?? "");
  const category = String(body?.category ?? "").trim();
  const stem = String(body?.stem ?? "").trim();
  const optionA = String(body?.optionA ?? "").trim();
  const optionB = String(body?.optionB ?? "").trim();
  const optionC = body?.optionC == null ? "" : String(body.optionC).trim();
  const optionD = body?.optionD == null ? "" : String(body.optionD).trim();
  const sourceNo = body?.sourceNo == null ? "" : String(body.sourceNo).trim();
  const correctAnswer = String(body?.correctAnswer ?? "").trim().toUpperCase();

  if (!category || !stem || !optionA || !optionB || !questionType || !correctAnswer) {
    return { error: "请完整填写题目信息" };
  }

  if (!["single", "judge"].includes(questionType)) {
    return { error: "题型不合法" };
  }

  if (questionType === "judge") {
    if (!["A", "B"].includes(correctAnswer)) {
      return { error: "判断题答案只能是 A 或 B" };
    }
  } else if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return { error: "单选题答案必须是 A/B/C/D" };
  }

  return {
    payload: {
      category,
      questionType: questionType as "single" | "judge",
      sourceNo: sourceNo || null,
      stem,
      optionA,
      optionB,
      optionC: optionC || null,
      optionD: optionD || null,
      correctAnswer,
    },
  };
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/api/admin/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'admin'").get(body.username ?? "") as Record<string, unknown> | undefined;

    if (!user || user.status !== "enabled" || !verifyPassword(body.password ?? "", String(user.password_hash))) {
      return reply.code(401).send({ message: "用户名或密码错误" });
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

  app.get("/api/admin/me", { preHandler: requireAdmin }, async (request) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(request.user.id) as Record<string, unknown>;
    return mapUser(user);
  });

  app.get("/api/admin/users", { preHandler: requireAdmin }, async () => {
    const rows = db.prepare("SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(mapUser);
  });

  app.post("/api/admin/me/password", { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      return reply.code(400).send({ message: "请完整填写密码信息" });
    }
    if (body.newPassword.length < 6) {
      return reply.code(400).send({ message: "新密码至少 6 位" });
    }

    const admin = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(request.user.id) as Record<string, unknown> | undefined;
    if (!admin) {
      return reply.code(404).send({ message: "管理员不存在" });
    }
    if (!verifyPassword(body.currentPassword, String(admin.password_hash))) {
      return reply.code(400).send({ message: "当前密码不正确" });
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(body.newPassword), nowIso(), request.user.id);
    return { success: true };
  });

  app.post("/api/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as {
      username?: string;
      realName?: string;
      phone?: string;
      password?: string;
    };

    if (!body.username || !body.realName || !body.phone || !body.password) {
      return reply.code(400).send({ message: "请完整填写用户信息" });
    }

    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(body.username) as { id: string } | undefined;
    if (exists) {
      return reply.code(400).send({ message: "用户名已存在" });
    }

    const now = nowIso();
    const userId = nanoid();
    db.prepare(`
      INSERT INTO users (
        id, username, real_name, phone, password_hash, role, status, last_login_at, created_at, updated_at
      ) VALUES (
        @id, @username, @real_name, @phone, @password_hash, @role, @status, @last_login_at, @created_at, @updated_at
      )
    `).run({
      id: userId,
      username: body.username,
      real_name: body.realName,
      phone: body.phone,
      password_hash: hashPassword(body.password),
      role: "user",
      status: "enabled",
      last_login_at: null,
      created_at: now,
      updated_at: now,
    });

    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Record<string, unknown>;
    return mapUser(created);
  });

  app.post("/api/admin/users/:id/status", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { status?: "enabled" | "disabled" };
    if (!body.status || !["enabled", "disabled"].includes(body.status)) {
      return reply.code(400).send({ message: "状态不合法" });
    }
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(body.status, nowIso(), params.id);
    return { success: true };
  });

  app.post("/api/admin/users/:id/password", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { newPassword?: string };
    if (!body.newPassword || body.newPassword.length < 6) {
      return reply.code(400).send({ message: "新密码至少 6 位" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'user'").get(params.id) as Record<string, unknown> | undefined;
    if (!user) {
      return reply.code(404).send({ message: "用户不存在" });
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(body.newPassword), nowIso(), params.id);
    return { success: true };
  });

  app.delete("/api/admin/users/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'user'").get(params.id) as Record<string, unknown> | undefined;
    if (!user) {
      return reply.code(404).send({ message: "用户不存在" });
    }

    const sessionRows = db.prepare("SELECT id FROM practice_sessions WHERE user_id = ?").all(params.id) as Array<{ id: string }>;
    const tx = db.transaction(() => {
      for (const session of sessionRows) {
        db.prepare("DELETE FROM session_questions WHERE session_id = ?").run(session.id);
      }
      db.prepare("DELETE FROM answer_records WHERE user_id = ?").run(params.id);
      db.prepare("DELETE FROM practice_sessions WHERE user_id = ?").run(params.id);
      db.prepare("DELETE FROM wrong_questions WHERE user_id = ?").run(params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(params.id);
    });
    tx();

    return { success: true };
  });

  app.get("/api/admin/question-banks/template", { preHandler: requireAdmin }, async (request, reply) => {
    const buffer = buildTemplateBuffer();
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", 'attachment; filename="question-bank-template.xlsx"');
    return reply.send(buffer);
  });

  app.post("/api/admin/import-jobs/upload", { preHandler: requireAdmin }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ message: "未收到上传文件" });
    }
    const buffer = await file.toBuffer();
    const parsed = parseImportFile(buffer);
    const now = nowIso();
    const jobId = nanoid();

    db.prepare(`
      INSERT INTO import_jobs (
        id, bank_name, bank_version, file_name, status, total_rows, success_rows, failed_rows, warning_rows,
        error_json, preview_json, uploaded_by, imported_bank_id, created_at, updated_at
      ) VALUES (
        @id, @bank_name, @bank_version, @file_name, @status, @total_rows, @success_rows, @failed_rows, @warning_rows,
        @error_json, @preview_json, @uploaded_by, @imported_bank_id, @created_at, @updated_at
      )
    `).run({
      id: jobId,
      bank_name: parsed.bankName,
      bank_version: parsed.bankVersion,
      file_name: file.filename,
      status: parsed.errors.length ? "failed" : "success",
      total_rows: parsed.totalRows,
      success_rows: parsed.preview.length,
      failed_rows: new Set(parsed.errors.map((item) => item.row)).size,
      warning_rows: 0,
      error_json: JSON.stringify(parsed.errors),
      preview_json: JSON.stringify(parsed.preview),
      uploaded_by: request.user.id,
      imported_bank_id: null,
      created_at: now,
      updated_at: now,
    });

    return {
      jobId,
      bankName: parsed.bankName,
      bankVersion: parsed.bankVersion,
      totalRows: parsed.totalRows,
      successRows: parsed.preview.length,
      failedRows: new Set(parsed.errors.map((item) => item.row)).size,
      errors: parsed.errors,
      preview: parsed.preview.slice(0, 20),
      canImport: parsed.errors.length === 0,
    };
  });

  app.get("/api/admin/import-jobs/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const job = db.prepare("SELECT * FROM import_jobs WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!job) {
      return reply.code(404).send({ message: "导入任务不存在" });
    }
    return {
      id: job.id,
      bankName: job.bank_name,
      bankVersion: job.bank_version,
      status: job.status,
      totalRows: job.total_rows,
      successRows: job.success_rows,
      failedRows: job.failed_rows,
      warningRows: job.warning_rows,
      importedBankId: job.imported_bank_id,
      errors: JSON.parse(String(job.error_json)),
      preview: JSON.parse(String(job.preview_json)),
    };
  });

  app.post("/api/admin/import-jobs/:id/import", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { bankName?: string; bankVersion?: string } | undefined;
    const job = db.prepare("SELECT * FROM import_jobs WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!job) {
      return reply.code(404).send({ message: "导入任务不存在" });
    }
    if (job.imported_bank_id) {
      return { bankId: job.imported_bank_id };
    }
    if (job.status !== "success") {
      return reply.code(400).send({ message: "当前导入任务未通过校验" });
    }

    const bankName = body?.bankName?.trim() || String(job.bank_name ?? "").trim();
    const bankVersion = body?.bankVersion?.trim() || String(job.bank_version ?? "").trim();
    if (!bankName) {
      return reply.code(400).send({ message: "请填写题库名称" });
    }
    if (!bankVersion) {
      return reply.code(400).send({ message: "请填写题库版本" });
    }

    const existingBank = db.prepare("SELECT id FROM question_banks WHERE name = ? AND version = ?")
      .get(bankName, bankVersion) as { id: string } | undefined;
    if (existingBank) {
      return reply.code(400).send({ message: "已存在相同题库名称和版本号的数据，请修改题库名称或版本号后再导入" });
    }

    const preview = JSON.parse(String(job.preview_json));
    let bankId = "";
    try {
      bankId = createQuestionBankFromImport({
        bankName,
        bankVersion,
        questions: preview,
        importedBy: request.user.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("UNIQUE constraint failed: question_banks.name, question_banks.version")) {
        return reply.code(400).send({ message: "已存在相同题库名称和版本号的数据，请修改题库名称或版本号后再导入" });
      }
      throw error;
    }

    db.prepare("UPDATE import_jobs SET bank_name = ?, bank_version = ?, imported_bank_id = ?, updated_at = ? WHERE id = ?")
      .run(bankName, bankVersion, bankId, nowIso(), params.id);
    return { bankId };
  });

  app.get("/api/admin/question-banks", { preHandler: requireAdmin }, async () => {
    const rows = db.prepare("SELECT * FROM question_banks ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(mapBank);
  });

  app.get("/api/admin/question-banks/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在" });
    }

    const questions = db
      .prepare(`
        SELECT id, category, question_type, source_no, stem, option_a, option_b, option_c, option_d, correct_answer, sort_no
        FROM questions WHERE bank_id = ? ORDER BY sort_no ASC
      `)
      .all(params.id) as Record<string, unknown>[];

    const categories = db
      .prepare(`
        SELECT category, COUNT(*) as count
        FROM questions
        WHERE bank_id = ?
        GROUP BY category
        ORDER BY count DESC, category ASC
      `)
      .all(params.id);

    return {
      ...mapBank(bank),
      categories,
      questions,
    };
  });

  app.post("/api/admin/question-banks/:id/questions", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在" });
    }

    const validated = validateQuestionPayload((request.body as Record<string, unknown> | undefined));
    if ("error" in validated) {
      return reply.code(400).send({ message: validated.error });
    }

    const questionId = createQuestion({
      bankId: params.id,
      ...validated.payload,
    });

    return { questionId };
  });

  app.patch("/api/admin/question-banks/:bankId/questions/:questionId", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { bankId: string; questionId: string };
    const question = db.prepare("SELECT * FROM questions WHERE id = ? AND bank_id = ?").get(params.questionId, params.bankId) as Record<string, unknown> | undefined;
    if (!question) {
      return reply.code(404).send({ message: "题目不存在" });
    }

    const validated = validateQuestionPayload((request.body as Record<string, unknown> | undefined));
    if ("error" in validated) {
      return reply.code(400).send({ message: validated.error });
    }

    updateQuestion({
      questionId: params.questionId,
      bankId: params.bankId,
      ...validated.payload,
    });

    return { success: true };
  });

  app.delete("/api/admin/question-banks/:bankId/questions/:questionId", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { bankId: string; questionId: string };
    const question = db.prepare("SELECT * FROM questions WHERE id = ? AND bank_id = ?").get(params.questionId, params.bankId) as Record<string, unknown> | undefined;
    if (!question) {
      return reply.code(404).send({ message: "题目不存在" });
    }

    deleteQuestion(params.bankId, params.questionId);
    return { success: true };
  });

  app.post("/api/admin/question-banks/:id/publish", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在" });
    }
    db.prepare("UPDATE question_banks SET status = 'published', published_by = ?, published_at = ?, updated_at = ? WHERE id = ?")
      .run(request.user.id, nowIso(), nowIso(), params.id);
    return { success: true };
  });

  app.post("/api/admin/question-banks/:id/disable", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在" });
    }
    db.prepare("UPDATE question_banks SET status = 'disabled', updated_at = ? WHERE id = ?").run(nowIso(), params.id);
    return { success: true };
  });

  app.delete("/api/admin/question-banks/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const bank = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!bank) {
      return reply.code(404).send({ message: "题库不存在" });
    }

    const sessionRows = db.prepare("SELECT id FROM practice_sessions WHERE bank_id = ?").all(params.id) as Array<{ id: string }>;
    const tx = db.transaction(() => {
      for (const session of sessionRows) {
        db.prepare("DELETE FROM session_questions WHERE session_id = ?").run(session.id);
      }
      db.prepare("DELETE FROM answer_records WHERE bank_id = ?").run(params.id);
      db.prepare("DELETE FROM practice_sessions WHERE bank_id = ?").run(params.id);
      db.prepare("DELETE FROM wrong_questions WHERE bank_id = ?").run(params.id);
      db.prepare("DELETE FROM questions WHERE bank_id = ?").run(params.id);
      db.prepare("DELETE FROM import_jobs WHERE imported_bank_id = ?").run(params.id);
      db.prepare("DELETE FROM question_banks WHERE id = ?").run(params.id);
    });
    tx();

    return { success: true };
  });

  app.get("/api/admin/practice-sessions", { preHandler: requireAdmin }, async () => {
    const rows = db
      .prepare(`
        SELECT
          s.id,
          s.mode,
          s.status,
          s.total_count,
          s.answered_count,
          s.correct_count,
          s.wrong_count,
          s.started_at,
          s.submitted_at,
          u.username,
          u.real_name,
          b.name as bank_name,
          b.version as bank_version
        FROM practice_sessions s
        JOIN users u ON u.id = s.user_id
        JOIN question_banks b ON b.id = s.bank_id
        ORDER BY s.created_at DESC
      `)
      .all();
    return rows;
  });

  app.get("/api/admin/practice-sessions/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = request.params as { id: string };
    const session = db.prepare("SELECT * FROM practice_sessions WHERE id = ?").get(params.id) as Record<string, unknown> | undefined;
    if (!session) {
      return reply.code(404).send({ message: "练习记录不存在" });
    }

    const answers = db
      .prepare(`
        SELECT a.*, q.stem
        FROM answer_records a
        JOIN questions q ON q.id = a.question_id
        WHERE a.session_id = ?
        ORDER BY a.answered_at ASC
      `)
      .all(params.id);

    return {
      session,
      answers,
    };
  });
}
