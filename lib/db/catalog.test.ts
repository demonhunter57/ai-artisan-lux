import { describe, expect, it, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createTestDb } from "./testDb";
import { createCatalogItem, deleteCatalogItem, listCatalogItems, updateCatalogItem } from "./catalog";

describe("catalog", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
  });

  it("seede la bibliotheque depuis data/prestations-prix.json au premier appel", () => {
    const items = listCatalogItems(db);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.tvaRate === 17)).toBe(true);
  });

  it("ne re-seede pas si des articles existent deja", () => {
    listCatalogItems(db); // premier appel : seed
    createCatalogItem({ reference: "CUSTOM-1", description: "Article perso", unit: "u", unitPrice: 10 }, db);
    const items = listCatalogItems(db);
    const seededCount = items.length;

    const itemsAgain = listCatalogItems(db);
    expect(itemsAgain.length).toBe(seededCount);
  });

  it("cree, modifie et supprime un article", () => {
    const created = createCatalogItem(
      { reference: "TEST-REF", description: "Test", unit: "h", unitPrice: 42, tvaRate: 8 },
      db
    );
    expect(created.reference).toBe("TEST-REF");
    expect(created.tvaRate).toBe(8);

    const updated = updateCatalogItem(created.id!, { unitPrice: 55 }, db);
    expect(updated.unitPrice).toBe(55);
    expect(updated.reference).toBe("TEST-REF");

    deleteCatalogItem(created.id!, db);
    const items = listCatalogItems(db);
    expect(items.find((i) => i.id === created.id)).toBeUndefined();
  });
});
