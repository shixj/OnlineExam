import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { hashPassword } from "../utils/hash.js";
import { nowIso } from "../utils/time.js";

const dataDir = path.resolve(process.cwd(), "apps/server/data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "online-exam.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function ensureColumn(tableName: string, columnName: string, sql: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${sql}`);
  }
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      real_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS question_banks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      total_count INTEGER NOT NULL,
      single_count INTEGER NOT NULL,
      judge_count INTEGER NOT NULL,
      category_count INTEGER NOT NULL,
      imported_by TEXT,
      imported_at TEXT,
      published_by TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(name, version)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      category TEXT NOT NULL,
      question_type TEXT NOT NULL,
      source_no TEXT,
      stem TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT,
      option_d TEXT,
      correct_answer TEXT NOT NULL,
      sort_no INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      bank_name TEXT,
      bank_version TEXT,
      file_name TEXT NOT NULL,
      status TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      success_rows INTEGER NOT NULL DEFAULT 0,
      failed_rows INTEGER NOT NULL DEFAULT 0,
      warning_rows INTEGER NOT NULL DEFAULT 0,
      error_json TEXT NOT NULL DEFAULT '[]',
      preview_json TEXT NOT NULL DEFAULT '[]',
      uploaded_by TEXT,
      imported_bank_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      total_count INTEGER NOT NULL,
      answered_count INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      wrong_count INTEGER NOT NULL,
      current_index INTEGER NOT NULL,
      category_filter TEXT,
      last_question_id TEXT,
      last_answer TEXT,
      last_is_correct INTEGER,
      started_at TEXT NOT NULL,
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      sort_no INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      bank_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_type TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wrong_questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      first_wrong_at TEXT NOT NULL,
      last_wrong_at TEXT NOT NULL,
      wrong_count INTEGER NOT NULL,
      is_mastered INTEGER NOT NULL DEFAULT 0,
      mastered_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, bank_id, question_id)
    );
  `);

  ensureColumn("practice_sessions", "category_filter", "category_filter TEXT");

  seedUsers();
}

export function resetDatabase() {
  db.exec(`
    DELETE FROM answer_records;
    DELETE FROM session_questions;
    DELETE FROM practice_sessions;
    DELETE FROM wrong_questions;
    DELETE FROM questions;
    DELETE FROM question_banks;
    DELETE FROM import_jobs;
    DELETE FROM users;
  `);
  seedUsers();
}

function seedUsers() {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const now = nowIso();
  const insert = db.prepare(`
    INSERT INTO users (
      id, username, real_name, phone, password_hash, role, status, last_login_at, created_at, updated_at
    ) VALUES (
      @id, @username, @real_name, @phone, @password_hash, @role, @status, @last_login_at, @created_at, @updated_at
    )
  `);

  insert.run({
    id: "admin-1",
    username: "admin",
    real_name: "系统管理员",
    phone: "13800000000",
    password_hash: hashPassword("admin123"),
    role: "admin",
    status: "enabled",
    last_login_at: null,
    created_at: now,
    updated_at: now,
  });

  insert.run({
    id: "user-1",
    username: "student1",
    real_name: "测试学员",
    phone: "13900000000",
    password_hash: hashPassword("123456"),
    role: "user",
    status: "enabled",
    last_login_at: null,
    created_at: now,
    updated_at: now,
  });
}
