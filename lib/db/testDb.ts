import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const schema = fs.readFileSync(path.join(process.cwd(), "lib", "db", "schema.sql"), "utf-8");
  db.exec(schema);
  return db;
}
