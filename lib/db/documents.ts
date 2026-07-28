import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { z } from "zod";
import { format } from "date-fns";
import { getDb } from "./connection";
import { Devis, DevisItem } from "@/types";
import { computeDevisTotals, generateDocumentNumber } from "@/lib/devis";
import { DocumentRecordSchema, DocumentUpdateSchema } from "@/lib/ai/schemas";
import { hasJournalEntry, insertJournalEntry } from "./journal";
import { ACCOUNT_BANK, ACCOUNT_CLIENTS, ACCOUNT_SALES, ACCOUNT_VAT_COLLECTED } from "@/constants/accounts";

export type DocumentCreateInput = z.infer<typeof DocumentRecordSchema>;
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>;

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

interface DocumentRow {
  id: string;
  number: string;
  type: string;
  status: string;
  date: string;
  valid_until: string | null;
  due_date: string | null;
  client_name: string;
  client_address: string | null;
  client_city: string | null;
  client_postal: string | null;
  client_country: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_tva_number: string | null;
  tva_rate: number;
  subtotal: number;
  tva_amount: number;
  total: number;
  notes: string | null;
  signature_data_url: string | null;
  signer_name: string | null;
  signed_at: string | null;
  is_renovation_principal: number;
  language: string | null;
  source_devis_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  document_id: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

function rowToDevis(row: DocumentRow, items: ItemRow[]): Devis {
  return {
    id: row.id,
    number: row.number,
    type: row.type as Devis["type"],
    status: row.status as Devis["status"],
    date: row.date,
    validUntil: row.valid_until ?? undefined,
    dueDate: row.due_date ?? undefined,
    client: {
      name: row.client_name,
      address: row.client_address ?? undefined,
      city: row.client_city ?? undefined,
      postal: row.client_postal ?? undefined,
      country: row.client_country ?? undefined,
      phone: row.client_phone ?? undefined,
      email: row.client_email ?? undefined,
      tvaNumber: row.client_tva_number ?? undefined,
    },
    items: [...items]
      .sort((a, b) => a.position - b.position)
      .map((item): DevisItem => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        total: item.total,
      })),
    tvaRate: row.tva_rate,
    subtotal: row.subtotal,
    tvaAmount: row.tva_amount,
    total: row.total,
    notes: row.notes ?? undefined,
    signatureDataUrl: row.signature_data_url ?? undefined,
    signerName: row.signer_name ?? undefined,
    signedAt: row.signed_at ?? undefined,
    isRenovationPrincipal: Boolean(row.is_renovation_principal),
    language: (row.language as Devis["language"]) ?? undefined,
  };
}

function fetchDocumentRow(db: DatabaseSync, id: string): DocumentRow | null {
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as unknown as DocumentRow | undefined;
  return row ?? null;
}

function fetchItemRows(db: DatabaseSync, documentId: string): ItemRow[] {
  return db
    .prepare("SELECT * FROM document_items WHERE document_id = ? ORDER BY position")
    .all(documentId) as unknown as ItemRow[];
}

function insertItems(db: DatabaseSync, documentId: string, items: DevisItem[]): void {
  const insert = db.prepare(
    "INSERT INTO document_items (id, document_id, position, description, quantity, unit, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  items.forEach((item, index) => {
    insert.run(randomUUID(), documentId, index, item.description, item.quantity, item.unit, item.unitPrice, item.total);
  });
}

function replaceItems(db: DatabaseSync, documentId: string, items: DevisItem[]): void {
  db.prepare("DELETE FROM document_items WHERE document_id = ?").run(documentId);
  insertItems(db, documentId, items);
}

export function getDocument(id: string, db: DatabaseSync = getDb()): Devis | null {
  const row = fetchDocumentRow(db, id);
  if (!row) return null;
  return rowToDevis(row, fetchItemRows(db, id));
}

export interface ListDocumentsFilters {
  type?: Devis["type"];
  status?: Devis["status"];
  limit?: number;
  offset?: number;
}

export interface ListDocumentsResult {
  documents: Devis[];
  total: number;
}

export function listDocuments(filters: ListDocumentsFilters = {}, db: DatabaseSync = getDb()): ListDocumentsResult {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.type) {
    conditions.push("type = ?");
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS count FROM documents ${where}`)
    .get(...params) as unknown as { count: number };
  const rows = db
    .prepare(`SELECT * FROM documents ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as unknown as DocumentRow[];

  return {
    documents: rows.map((row) => rowToDevis(row, fetchItemRows(db, row.id))),
    total: totalRow.count,
  };
}

/** Emet l'ecriture "facture emise" si elle n'existe pas deja (idempotent). Factures uniquement. */
function recordInvoiceIssuedIfNeeded(db: DatabaseSync, doc: Devis): void {
  if (doc.type !== "facture" || !doc.id) return;
  if (hasJournalEntry(doc.id, "invoice_issued", db)) return;

  insertJournalEntry(
    {
      date: doc.date,
      label: `Facture ${doc.number} emise`,
      documentId: doc.id,
      eventType: "invoice_issued",
      lines: [
        { accountCode: ACCOUNT_CLIENTS, debit: doc.total },
        { accountCode: ACCOUNT_SALES, credit: doc.subtotal },
        { accountCode: ACCOUNT_VAT_COLLECTED, credit: doc.tvaAmount },
      ],
    },
    db
  );
}

/** Emet l'ecriture "facture payee", en garantissant d'abord que l'emission a ete comptabilisee. */
function recordInvoicePaidIfNeeded(db: DatabaseSync, doc: Devis): void {
  if (doc.type !== "facture" || !doc.id) return;
  recordInvoiceIssuedIfNeeded(db, doc);
  if (hasJournalEntry(doc.id, "invoice_paid", db)) return;

  insertJournalEntry(
    {
      date: today(),
      label: `Facture ${doc.number} payee`,
      documentId: doc.id,
      eventType: "invoice_paid",
      lines: [
        { accountCode: ACCOUNT_BANK, debit: doc.total },
        { accountCode: ACCOUNT_CLIENTS, credit: doc.total },
      ],
    },
    db
  );
}

/**
 * Si la facture annulee a deja des ecritures (emission et/ou paiement), genere une ecriture
 * d'extourne inverse pour ramener son solde a zero. Les ecritures d'origine ne sont jamais supprimees.
 */
function recordInvoiceReversalIfNeeded(db: DatabaseSync, doc: Devis): void {
  if (doc.type !== "facture" || !doc.id) return;
  if (hasJournalEntry(doc.id, "invoice_reversed", db)) return;

  const wasIssued = hasJournalEntry(doc.id, "invoice_issued", db);
  const wasPaid = hasJournalEntry(doc.id, "invoice_paid", db);
  if (!wasIssued && !wasPaid) return;

  const lines: { accountCode: string; debit?: number; credit?: number }[] = [];

  if (wasPaid) {
    lines.push({ accountCode: ACCOUNT_CLIENTS, debit: doc.total });
    lines.push({ accountCode: ACCOUNT_BANK, credit: doc.total });
  }
  if (wasIssued) {
    lines.push({ accountCode: ACCOUNT_SALES, debit: doc.subtotal });
    lines.push({ accountCode: ACCOUNT_VAT_COLLECTED, debit: doc.tvaAmount });
    lines.push({ accountCode: ACCOUNT_CLIENTS, credit: doc.total });
  }

  insertJournalEntry(
    {
      date: today(),
      label: `Facture ${doc.number} annulee (extourne)`,
      documentId: doc.id,
      eventType: "invoice_reversed",
      lines,
    },
    db
  );
}

export function createDocument(input: DocumentCreateInput, db: DatabaseSync = getDb()): Devis {
  const id = randomUUID();
  const now = nowIso();
  const date = input.date ?? today();
  const status = input.status ?? "draft";
  const number = input.number ?? generateDocumentNumber(input.type, new Date(date));
  const validUntil = input.validUntil ?? (input.type === "devis"
    ? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
    : undefined);

  const normalized = computeDevisTotals(input) as Devis;

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO documents (
        id, number, type, status, date, valid_until, due_date,
        client_name, client_address, client_city, client_postal, client_country, client_phone, client_email, client_tva_number,
        tva_rate, subtotal, tva_amount, total, notes,
        signature_data_url, signer_name, signed_at, is_renovation_principal, language, source_devis_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, number, input.type, status, date,
      validUntil ?? null, input.dueDate ?? null,
      input.client.name, input.client.address ?? null, input.client.city ?? null, input.client.postal ?? null,
      input.client.country ?? null, input.client.phone ?? null, input.client.email ?? null, input.client.tvaNumber ?? null,
      normalized.tvaRate ?? 0, normalized.subtotal ?? 0, normalized.tvaAmount ?? 0, normalized.total ?? 0,
      input.notes ?? null,
      input.signatureDataUrl ?? null, input.signerName ?? null, input.signedAt ?? null,
      input.isRenovationPrincipal ? 1 : 0, input.language ?? null, null,
      now, now
    );

    insertItems(db, id, normalized.items ?? []);

    const created = getDocument(id, db)!;
    if (created.type === "facture" && created.status !== "draft") {
      recordInvoiceIssuedIfNeeded(db, created);
    }

    db.exec("COMMIT");
    return created;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function updateDocument(id: string, patch: DocumentUpdateInput, db: DatabaseSync = getDb()): Devis {
  const existing = getDocument(id, db);
  if (!existing) {
    throw new Error(`Document introuvable: ${id}`);
  }

  const merged: Devis = {
    ...existing,
    ...patch,
    client: { ...existing.client, ...patch.client },
  } as Devis;
  const normalized = computeDevisTotals(merged) as Devis;
  const now = nowIso();

  db.exec("BEGIN");
  try {
    db.prepare(
      `UPDATE documents SET
        number = ?, type = ?, status = ?, date = ?, valid_until = ?, due_date = ?,
        client_name = ?, client_address = ?, client_city = ?, client_postal = ?, client_country = ?, client_phone = ?, client_email = ?, client_tva_number = ?,
        tva_rate = ?, subtotal = ?, tva_amount = ?, total = ?, notes = ?,
        signature_data_url = ?, signer_name = ?, signed_at = ?, is_renovation_principal = ?, language = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      (normalized.number ?? existing.number)!, normalized.type, normalized.status, normalized.date,
      normalized.validUntil ?? null, normalized.dueDate ?? null,
      normalized.client.name, normalized.client.address ?? null, normalized.client.city ?? null, normalized.client.postal ?? null,
      normalized.client.country ?? null, normalized.client.phone ?? null, normalized.client.email ?? null, normalized.client.tvaNumber ?? null,
      normalized.tvaRate, normalized.subtotal, normalized.tvaAmount, normalized.total,
      normalized.notes ?? null,
      normalized.signatureDataUrl ?? null, normalized.signerName ?? null, normalized.signedAt ?? null,
      normalized.isRenovationPrincipal ? 1 : 0, normalized.language ?? null,
      now, id
    );

    replaceItems(db, id, normalized.items ?? []);

    const updated = getDocument(id, db)!;
    const statusChanged = patch.status !== undefined && patch.status !== existing.status;

    if (updated.type === "facture" && statusChanged) {
      if (updated.status === "paid") {
        recordInvoicePaidIfNeeded(db, updated);
      } else if (updated.status === "cancelled") {
        recordInvoiceReversalIfNeeded(db, updated);
      } else if (existing.status === "draft" && updated.status !== "draft") {
        recordInvoiceIssuedIfNeeded(db, updated);
      }
    }

    db.exec("COMMIT");
    return updated;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function updateDocumentStatus(id: string, status: Devis["status"], db: DatabaseSync = getDb()): Devis {
  return updateDocument(id, { status }, db);
}

/** Cree une NOUVELLE facture a partir d'un devis (le devis original n'est pas modifie). */
export function convertDevisToFacture(devisId: string, db: DatabaseSync = getDb()): Devis {
  const source = getDocument(devisId, db);
  if (!source) {
    throw new Error(`Devis introuvable: ${devisId}`);
  }
  if (source.type !== "devis") {
    throw new Error("Seul un devis peut etre converti en facture");
  }

  const id = randomUUID();
  const now = nowIso();
  const date = today();
  const dueDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  const number = generateDocumentNumber("facture", new Date());

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO documents (
        id, number, type, status, date, valid_until, due_date,
        client_name, client_address, client_city, client_postal, client_country, client_phone, client_email, client_tva_number,
        tva_rate, subtotal, tva_amount, total, notes,
        signature_data_url, signer_name, signed_at, is_renovation_principal, language, source_devis_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, number, "facture", "draft", date, null, dueDate,
      source.client.name, source.client.address ?? null, source.client.city ?? null, source.client.postal ?? null,
      source.client.country ?? null, source.client.phone ?? null, source.client.email ?? null, source.client.tvaNumber ?? null,
      source.tvaRate, source.subtotal, source.tvaAmount, source.total,
      source.notes ?? null,
      null, null, null,
      source.isRenovationPrincipal ? 1 : 0, source.language ?? null, source.id ?? null,
      now, now
    );

    insertItems(db, id, source.items);

    const created = getDocument(id, db)!;
    db.exec("COMMIT");
    return created;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
