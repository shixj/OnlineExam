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

async function adminToken(app: FastifyInstance) {
  const response = await app.inject({
    method: "POST",
    url: "/api/admin/login",
    payload: { username: "admin", password: "admin123" },
  });
  assert.equal(response.statusCode, 200);
  return response.json().token as string;
}

describe("import and publish workflow", async () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer();
  });

  after(async () => {
    await app.close();
  });

  it("rejects malformed Excel rows with row-level errors", async () => {
    resetDatabase();
    const token = await adminToken(app);
    const invalidBuffer = createWorkbook([
      ["题库名称", "题库版本", "分类", "题型", "题号", "题干", "选项A", "选项B", "选项C", "选项D", "正确答案"],
      ["测试题库", "v1", "网络安全", "判断题", "1", "安全漏洞是系统中的缺陷。", "是", "否", "", "", "A"],
    ]);
    const multipart = createMultipartBody("invalid.xlsx", invalidBuffer);

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/import-jobs/upload",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.body,
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.canImport, false);
    assert.equal(payload.errors[0].row, 2);
  });

  it("imports and publishes a validated bank version", async () => {
    resetDatabase();
    const token = await adminToken(app);
    const validBuffer = createWorkbook([
      ["题库名称", "题库版本", "分类", "题型", "题号", "题干", "选项A", "选项B", "选项C", "选项D", "正确答案"],
      ["自动化题库", "v1", "网络安全", "判断题", "1", "安全漏洞是系统中的缺陷。", "正确", "错误", "", "", "A"],
      ["自动化题库", "v1", "互联网基础", "单选题", "2", "HTTPS 的主要优势是", "加载更快", "更安全", "字体更大", "图片更清晰", "B"],
    ]);
    const multipart = createMultipartBody("valid.xlsx", validBuffer);

    const upload = await app.inject({
      method: "POST",
      url: "/api/admin/import-jobs/upload",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.body,
    });

    assert.equal(upload.statusCode, 200);
    const uploadPayload = upload.json();
    assert.equal(uploadPayload.canImport, true);

    const imported = await app.inject({
      method: "POST",
      url: `/api/admin/import-jobs/${uploadPayload.jobId}/import`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      payload: { bankName: "后台手填题库名" },
    });
    assert.equal(imported.statusCode, 200);
    const bankId = imported.json().bankId as string;

    const publish = await app.inject({
      method: "POST",
      url: `/api/admin/question-banks/${bankId}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(publish.statusCode, 200);

    const banks = await app.inject({
      method: "GET",
      url: "/api/admin/question-banks",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(banks.statusCode, 200);
    const bank = banks.json().find((item: { id: string }) => item.id === bankId);
    assert.equal(bank.status, "published");
    assert.equal(bank.name, "后台手填题库名");
    assert.equal(bank.totalCount, 2);
  });
});
