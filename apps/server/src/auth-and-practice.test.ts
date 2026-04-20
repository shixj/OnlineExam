import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./index.js";
import { resetDatabase } from "./db/database.js";

function createWorkbook(rows: string[][]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "questions");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function createMultipartBody(fileName: string, buffer: Buffer) {
  const boundary = `----online-exam-${Date.now()}`;
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  return {
    boundary,
    body: Buffer.concat([Buffer.from(head), buffer, Buffer.from(tail)]),
  };
}

async function login(app: FastifyInstance, path: string, payload: { username: string; password: string }) {
  const response = await app.inject({
    method: "POST",
    url: path,
    payload,
  });
  assert.equal(response.statusCode, 200);
  return response.json().token as string;
}

async function publishBank(app: FastifyInstance) {
  const admin = await login(app, "/api/admin/login", { username: "admin", password: "admin123" });
  const buffer = createWorkbook([
    ["题库名称", "题库版本", "分类", "题型", "题号", "题干", "选项A", "选项B", "选项C", "选项D", "正确答案"],
    ["练习题库", "v1", "网络安全", "判断题", "1", "安全漏洞是系统中的缺陷。", "正确", "错误", "", "", "A"],
    ["练习题库", "v1", "互联网基础", "单选题", "2", "HTTPS 的主要优势是", "加载更快", "更安全", "字体更大", "图片更清晰", "B"],
  ]);
  const multipart = createMultipartBody("practice.xlsx", buffer);

  const upload = await app.inject({
    method: "POST",
    url: "/api/admin/import-jobs/upload",
    headers: {
      authorization: `Bearer ${admin}`,
      "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
    },
    payload: multipart.body,
  });
  const jobId = upload.json().jobId as string;
  const imported = await app.inject({
    method: "POST",
    url: `/api/admin/import-jobs/${jobId}/import`,
    headers: { authorization: `Bearer ${admin}` },
  });
  const bankId = imported.json().bankId as string;
  await app.inject({
    method: "POST",
    url: `/api/admin/question-banks/${bankId}/publish`,
    headers: { authorization: `Bearer ${admin}` },
  });
  return bankId;
}

describe("authentication and practice flows", async () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer();
  });

  after(async () => {
    await app.close();
  });

  it("allows verified users to log in and list published banks", async () => {
    resetDatabase();
    const bankId = await publishBank(app);
    const user = await login(app, "/api/app/login", { username: "student1", password: "123456" });

    const banks = await app.inject({
      method: "GET",
      url: "/api/app/question-banks",
      headers: { authorization: `Bearer ${user}` },
    });

    assert.equal(banks.statusCode, 200);
    const bank = banks.json().find((item: { id: string }) => item.id === bankId);
    assert.equal(bank.name, "练习题库");
  });

  it("persists session progress and creates wrong-question practice data", async () => {
    resetDatabase();
    const bankId = await publishBank(app);
    const user = await login(app, "/api/app/login", { username: "student1", password: "123456" });

    const session = await app.inject({
      method: "POST",
      url: "/api/app/practice-sessions",
      headers: { authorization: `Bearer ${user}` },
      payload: { bankId, mode: "normal" },
    });
    assert.equal(session.statusCode, 200);
    const sessionPayload = session.json();

    const answer = await app.inject({
      method: "POST",
      url: `/api/app/practice-sessions/${sessionPayload.sessionId}/answer`,
      headers: { authorization: `Bearer ${user}` },
      payload: {
        questionId: sessionPayload.question.questionId,
        userAnswer: "B",
        durationSeconds: 4,
      },
    });
    assert.equal(answer.statusCode, 200);
    assert.equal(answer.json().isCorrect, false);

    const resume = await app.inject({
      method: "GET",
      url: `/api/app/practice-sessions/latest?bankId=${bankId}&mode=normal`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(resume.statusCode, 200);
    assert.equal(resume.json().session.id, sessionPayload.sessionId);

    const wrongList = await app.inject({
      method: "GET",
      url: `/api/app/wrong-questions?bankId=${bankId}`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(wrongList.statusCode, 200);
    assert.equal(wrongList.json().length, 1);

    const wrongPractice = await app.inject({
      method: "POST",
      url: "/api/app/wrong-practice-sessions",
      headers: { authorization: `Bearer ${user}` },
      payload: { bankId },
    });
    assert.equal(wrongPractice.statusCode, 200);
    assert.equal(wrongPractice.json().question.stem, "安全漏洞是系统中的缺陷。");
  });

  it("supports category practice and answered-question review", async () => {
    resetDatabase();
    const bankId = await publishBank(app);
    const user = await login(app, "/api/app/login", { username: "student1", password: "123456" });

    const session = await app.inject({
      method: "POST",
      url: "/api/app/practice-sessions",
      headers: { authorization: `Bearer ${user}` },
      payload: { bankId, mode: "normal", category: "网络安全" },
    });
    assert.equal(session.statusCode, 200);
    const sessionPayload = session.json();
    assert.equal(sessionPayload.totalCount, 1);
    assert.equal(sessionPayload.categoryFilter, "网络安全");
    assert.equal(sessionPayload.progress.items.length, 1);
    assert.equal(sessionPayload.progress.items[0].status, "pending");

    const latest = await app.inject({
      method: "GET",
      url: `/api/app/practice-sessions/latest?bankId=${bankId}&mode=normal&category=${encodeURIComponent("网络安全")}`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(latest.statusCode, 200);
    assert.equal(latest.json().session.id, sessionPayload.sessionId);

    const answer = await app.inject({
      method: "POST",
      url: `/api/app/practice-sessions/${sessionPayload.sessionId}/answer`,
      headers: { authorization: `Bearer ${user}` },
      payload: {
        questionId: sessionPayload.question.questionId,
        userAnswer: "B",
        durationSeconds: 5,
      },
    });
    assert.equal(answer.statusCode, 200);
    assert.equal(answer.json().progress.items[0].status, "wrong");

    const review = await app.inject({
      method: "GET",
      url: `/api/app/practice-sessions/${sessionPayload.sessionId}/questions/${sessionPayload.question.questionId}`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(review.statusCode, 200);
    assert.equal(review.json().userAnswer, "B");
    assert.equal(review.json().correctAnswer, "A");
  });

  it("clears practice history and wrong-question data for the current user", async () => {
    resetDatabase();
    const bankId = await publishBank(app);
    const user = await login(app, "/api/app/login", { username: "student1", password: "123456" });

    const session = await app.inject({
      method: "POST",
      url: "/api/app/practice-sessions",
      headers: { authorization: `Bearer ${user}` },
      payload: { bankId, mode: "normal" },
    });
    const sessionPayload = session.json();

    await app.inject({
      method: "POST",
      url: `/api/app/practice-sessions/${sessionPayload.sessionId}/answer`,
      headers: { authorization: `Bearer ${user}` },
      payload: {
        questionId: sessionPayload.question.questionId,
        userAnswer: "B",
        durationSeconds: 3,
      },
    });

    const beforeHistory = await app.inject({
      method: "GET",
      url: "/api/app/practice-sessions/history",
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(beforeHistory.statusCode, 200);
    assert.equal(beforeHistory.json().length, 1);

    const beforeWrong = await app.inject({
      method: "GET",
      url: `/api/app/wrong-questions?bankId=${bankId}`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(beforeWrong.statusCode, 200);
    assert.equal(beforeWrong.json().length, 1);

    const cleared = await app.inject({
      method: "POST",
      url: "/api/app/practice-sessions/history/clear",
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(cleared.statusCode, 200);
    assert.equal(cleared.json().success, true);

    const afterHistory = await app.inject({
      method: "GET",
      url: "/api/app/practice-sessions/history",
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(afterHistory.statusCode, 200);
    assert.equal(afterHistory.json().length, 0);

    const afterWrong = await app.inject({
      method: "GET",
      url: `/api/app/wrong-questions?bankId=${bankId}`,
      headers: { authorization: `Bearer ${user}` },
    });
    assert.equal(afterWrong.statusCode, 200);
    assert.equal(afterWrong.json().length, 0);
  });
});
