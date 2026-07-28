import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "runtime", "app.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

const globalForDb = globalThis as unknown as { __aiArtisanDb?: DatabaseSync };

function runMigrations(db: DatabaseSync): void {
  const sql = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(sql);
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__aiArtisanDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON;");
    runMigrations(db);
    globalForDb.__aiArtisanDb = db;
  }
  return globalForDb.__aiArtisanDb;
}
