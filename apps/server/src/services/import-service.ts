import XLSX from "xlsx";
import {
  EXCEL_HEADERS,
  ImportErrorItem,
  ImportPreviewQuestion,
  JUDGE_OPTION_A,
  JUDGE_OPTION_B,
  QuestionType,
} from "@online-exam/shared";

type ParseResult = {
  bankName: string;
  bankVersion: string;
  totalRows: number;
  preview: ImportPreviewQuestion[];
  errors: ImportErrorItem[];
};

function normalizeCell(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeQuestionType(value: string): QuestionType | null {
  if (value === "判断题") return "judge";
  if (value === "单选题") return "single";
  return null;
}

function parseAnswer(value: string): "A" | "B" | "C" | "D" | null {
  if (["A", "B", "C", "D"].includes(value)) {
    return value as "A" | "B" | "C" | "D";
  }
  return null;
}

export function buildTemplateBuffer(): Buffer {
  const rows = [
    [...EXCEL_HEADERS],
    ["单选判断题", "v1.0", "网络安全", "判断题", "1", "安全漏洞指的是系统中的安全缺陷。", JUDGE_OPTION_A, JUDGE_OPTION_B, "", "", "A"],
    ["单选判断题", "v1.0", "互联网基础", "单选题", "1", "我们常说的“上网”，其核心依赖的网络体系是", "蓝牙体系", "红外体系", "电力体系", "互联网体系", "D"],
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "questions");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function parseImportFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets.questions;

  if (!sheet) {
    return {
      bankName: "",
      bankVersion: "",
      totalRows: 0,
      preview: [],
      errors: [{ row: 1, column: "questions", message: "缺少 questions 工作表" }],
    };
  }

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: "" });
  const errors: ImportErrorItem[] = [];
  const preview: ImportPreviewQuestion[] = [];
  const header = (rows[0] ?? []).map((value) => normalizeCell(value));

  EXCEL_HEADERS.forEach((expected, index) => {
    if (header[index] !== expected) {
      errors.push({
        row: 1,
        column: expected,
        message: `表头不匹配，期望为 ${expected}`,
      });
    }
  });

  let bankName = "";
  let bankVersion = "";

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (row.every((cell) => normalizeCell(cell) === "")) {
      continue;
    }

    const values = EXCEL_HEADERS.map((_, cellIndex) => normalizeCell(row[cellIndex]));
    const [
      currentBankName,
      currentBankVersion,
      category,
      rawType,
      sourceNo,
      stem,
      optionA,
      optionB,
      optionC,
      optionD,
      rawAnswer,
    ] = values;

    if (!bankName && currentBankName) bankName = currentBankName;
    if (!bankVersion && currentBankVersion) bankVersion = currentBankVersion;

    const questionType = normalizeQuestionType(rawType);
    const answer = parseAnswer(rawAnswer);
    const rowNumber = index + 1;

    if (!currentBankName) errors.push({ row: rowNumber, column: "题库名称", message: "题库名称不能为空" });
    if (!currentBankVersion) errors.push({ row: rowNumber, column: "题库版本", message: "题库版本不能为空" });
    if (!category) errors.push({ row: rowNumber, column: "分类", message: "分类不能为空" });
    if (!questionType) errors.push({ row: rowNumber, column: "题型", message: "题型只能是判断题或单选题" });
    if (!stem) errors.push({ row: rowNumber, column: "题干", message: "题干不能为空" });
    if (!optionA) errors.push({ row: rowNumber, column: "选项A", message: "选项A不能为空" });
    if (!optionB) errors.push({ row: rowNumber, column: "选项B", message: "选项B不能为空" });
    if (!answer) errors.push({ row: rowNumber, column: "正确答案", message: "正确答案只能是 A/B/C/D" });

    if (questionType === "judge") {
      if (optionA !== JUDGE_OPTION_A) {
        errors.push({ row: rowNumber, column: "选项A", message: "判断题选项A必须为“正确”" });
      }
      if (optionB !== JUDGE_OPTION_B) {
        errors.push({ row: rowNumber, column: "选项B", message: "判断题选项B必须为“错误”" });
      }
      if (optionC || optionD) {
        errors.push({ row: rowNumber, column: "选项C/选项D", message: "判断题不能填写选项C或选项D" });
      }
      if (answer && !["A", "B"].includes(answer)) {
        errors.push({ row: rowNumber, column: "正确答案", message: "判断题答案只能是 A 或 B" });
      }
    }

    if (questionType === "single") {
      if (!optionC) errors.push({ row: rowNumber, column: "选项C", message: "单选题选项C不能为空" });
      if (!optionD) errors.push({ row: rowNumber, column: "选项D", message: "单选题选项D不能为空" });
    }

    if (questionType && answer && errors.every((item) => item.row !== rowNumber)) {
      preview.push({
        category,
        questionType,
        sourceNo: sourceNo || null,
        stem,
        optionA,
        optionB,
        optionC: optionC || null,
        optionD: optionD || null,
        correctAnswer: answer,
      });
    }
  }

  return {
    bankName,
    bankVersion,
    totalRows: preview.length + new Set(errors.map((item) => item.row)).size - (errors.some((item) => item.row === 1) ? 1 : 0),
    preview,
    errors,
  };
}
