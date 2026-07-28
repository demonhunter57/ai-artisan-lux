import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./connection";

export class JournalImbalanceError extends Error {
  constructor(debit: number, credit: number) {
    super(`Ecriture desequilibree: debit=${debit} credit=${credit}`);
    this.name = "JournalImbalanceError";
  }
}

export type JournalEventType = "invoice_issued" | "invoice_paid" | "invoice_reversed";

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
}

export interface JournalEntryInput {
  date: string;
  label: string;
  documentId?: string | null;
  eventType: JournalEventType;
  lines: JournalLineInput[];
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  label: string;
  documentId: string | null;
  eventType: JournalEventType;
  lines: JournalLine[];
}

export interface Account {
  code: string;
  name: string;
  type: string;
}

export interface AccountBalance extends Account {
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

interface EntryRow {
  id: string;
  date: string;
  label: string;
  document_id: string | null;
  event_type: JournalEventType;
  created_at: string;
}

interface LineRow {
  id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

interface BalanceRow {
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
}

const BALANCE_TOLERANCE = 0.005;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Verifie si une ecriture d'un type donne existe deja pour ce document (idempotence).
 * Appele avant d'emettre une facture ou d'enregistrer un paiement pour eviter les doublons.
 */
export function hasJournalEntry(documentId: string, eventType: JournalEventType, db: DatabaseSync = getDb()): boolean {
  const row = db
    .prepare("SELECT 1 FROM journal_entries WHERE document_id = ? AND event_type = ? LIMIT 1")
    .get(documentId, eventType);
  return Boolean(row);
}

/**
 * Insere une ecriture comptable equilibree (debit total = credit total, tolerance au centime).
 * Ne gere pas sa propre transaction : a appeler depuis une transaction ouverte par l'appelant
 * (ex: lib/db/documents.ts) pour que l'ecriture et l'operation qui la declenche soient atomiques.
 */
export function insertJournalEntry(input: JournalEntryInput, db: DatabaseSync = getDb()): string {
  if (input.lines.length < 2) {
    throw new Error("Une ecriture comptable doit avoir au moins deux lignes");
  }

  const debitTotal = +input.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0).toFixed(2);
  const creditTotal = +input.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0).toFixed(2);

  if (Math.abs(debitTotal - creditTotal) > BALANCE_TOLERANCE) {
    throw new JournalImbalanceError(debitTotal, creditTotal);
  }

  const entryId = randomUUID();
  const now = nowIso();

  db.prepare(
    "INSERT INTO journal_entries (id, date, label, document_id, event_type, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(entryId, input.date, input.label, input.documentId ?? null, input.eventType, now);

  const insertLine = db.prepare(
    "INSERT INTO journal_lines (id, entry_id, account_code, debit, credit) VALUES (?, ?, ?, ?, ?)"
  );
  for (const line of input.lines) {
    insertLine.run(randomUUID(), entryId, line.accountCode, line.debit ?? 0, line.credit ?? 0);
  }

  return entryId;
}

export function listJournalEntries(
  filters: { accountCode?: string; from?: string; to?: string } = {},
  db: DatabaseSync = getDb()
): JournalEntry[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.from) {
    conditions.push("date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("date <= ?");
    params.push(filters.to);
  }
  if (filters.accountCode) {
    conditions.push("id IN (SELECT entry_id FROM journal_lines WHERE account_code = ?)");
    params.push(filters.accountCode);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const entryRows = db
    .prepare(`SELECT * FROM journal_entries ${where} ORDER BY date DESC, created_at DESC`)
    .all(...params) as unknown as EntryRow[];

  const lineStmt = db.prepare(
    "SELECT jl.id, jl.account_code, a.name AS account_name, jl.debit, jl.credit FROM journal_lines jl JOIN accounts a ON a.code = jl.account_code WHERE jl.entry_id = ?"
  );

  return entryRows.map((entry) => {
    const lineRows = lineStmt.all(entry.id) as unknown as LineRow[];
    return {
      id: entry.id,
      date: entry.date,
      label: entry.label,
      documentId: entry.document_id,
      eventType: entry.event_type,
      lines: lineRows.map((l) => ({
        id: l.id,
        accountCode: l.account_code,
        accountName: l.account_name,
        debit: l.debit,
        credit: l.credit,
      })),
    };
  });
}

export function getAccountBalances(db: DatabaseSync = getDb()): AccountBalance[] {
  const rows = db
    .prepare(
      `SELECT a.code, a.name, a.type,
         COALESCE(SUM(jl.debit), 0) AS debitTotal,
         COALESCE(SUM(jl.credit), 0) AS creditTotal
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_code = a.code
       GROUP BY a.code, a.name, a.type
       ORDER BY a.code`
    )
    .all() as unknown as BalanceRow[];

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    type: r.type,
    debitTotal: r.debitTotal,
    creditTotal: r.creditTotal,
    balance: +(r.debitTotal - r.creditTotal).toFixed(2),
  }));
}

export function listAccounts(db: DatabaseSync = getDb()): Account[] {
  return db.prepare("SELECT code, name, type FROM accounts ORDER BY code").all() as unknown as Account[];
}
