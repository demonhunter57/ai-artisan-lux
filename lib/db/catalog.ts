import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./connection";
import { PriceCatalogItem } from "@/types";
import { DEFAULT_TVA_RATE } from "@/constants/tva";

interface CatalogItemRow {
  id: string;
  reference: string;
  description: string;
  unit: string;
  unit_price: number;
  tva_rate: number;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToItem(row: CatalogItemRow): PriceCatalogItem {
  return {
    id: row.id,
    reference: row.reference,
    description: row.description,
    unit: row.unit,
    unitPrice: row.unit_price,
    tvaRate: row.tva_rate,
  };
}

/**
 * Seede la bibliotheque depuis data/prestations-prix.json si la table est vide.
 * N'ecrase jamais des donnees existantes (idempotent, ne s'execute qu'une fois).
 */
export function seedCatalogIfEmpty(db: DatabaseSync = getDb()): void {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM catalog_items").get() as unknown as { count: number };
  if (count > 0) return;

  const seedPath = path.join(process.cwd(), "data", "prestations-prix.json");
  if (!fs.existsSync(seedPath)) return;

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as {
    items: { reference: string; description: string; unit: string; unitPrice: number }[];
  };

  const now = nowIso();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO catalog_items (id, reference, description, unit, unit_price, tva_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const item of seed.items) {
    insert.run(randomUUID(), item.reference, item.description, item.unit, item.unitPrice, DEFAULT_TVA_RATE, now, now);
  }
}

export function listCatalogItems(db: DatabaseSync = getDb()): PriceCatalogItem[] {
  seedCatalogIfEmpty(db);
  const rows = db
    .prepare("SELECT * FROM catalog_items ORDER BY description")
    .all() as unknown as CatalogItemRow[];
  return rows.map(rowToItem);
}

export function getCatalogItem(id: string, db: DatabaseSync = getDb()): PriceCatalogItem | null {
  const row = db.prepare("SELECT * FROM catalog_items WHERE id = ?").get(id) as unknown as CatalogItemRow | undefined;
  return row ? rowToItem(row) : null;
}

export interface CatalogItemInput {
  reference: string;
  description: string;
  unit: string;
  unitPrice: number;
  tvaRate?: number;
}

export function createCatalogItem(input: CatalogItemInput, db: DatabaseSync = getDb()): PriceCatalogItem {
  const id = randomUUID();
  const now = nowIso();
  db.prepare(
    "INSERT INTO catalog_items (id, reference, description, unit, unit_price, tva_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, input.reference, input.description, input.unit, input.unitPrice, input.tvaRate ?? DEFAULT_TVA_RATE, now, now);
  return getCatalogItem(id, db)!;
}

export function updateCatalogItem(id: string, patch: Partial<CatalogItemInput>, db: DatabaseSync = getDb()): PriceCatalogItem {
  const existing = getCatalogItem(id, db);
  if (!existing) {
    throw new Error(`Article introuvable: ${id}`);
  }

  const merged = { ...existing, ...patch };
  db.prepare(
    "UPDATE catalog_items SET reference = ?, description = ?, unit = ?, unit_price = ?, tva_rate = ?, updated_at = ? WHERE id = ?"
  ).run(merged.reference, merged.description, merged.unit, merged.unitPrice, merged.tvaRate, nowIso(), id);

  return getCatalogItem(id, db)!;
}

export function deleteCatalogItem(id: string, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM catalog_items WHERE id = ?").run(id);
}
