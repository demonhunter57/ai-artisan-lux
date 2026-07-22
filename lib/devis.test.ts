import { describe, expect, it } from "vitest";
import { computeDevisTotals } from "./devis";

describe("computeDevisTotals", () => {
  it("recalcule les totaux et arrondit a 2 decimales", () => {
    const result = computeDevisTotals({
      tvaRate: 17,
      items: [
        { description: "Peinture", quantity: 10, unit: "m2", unitPrice: 12.345, total: 0 },
        { description: "Main d'oeuvre", quantity: 2.5, unit: "h", unitPrice: 49.99, total: 0 },
      ],
    });

    expect(result.subtotal).toBe(248.43);
    expect(result.tvaAmount).toBe(42.23);
    expect(result.total).toBe(290.66);
    expect(result.items?.[0].total).toBe(123.45);
  });

  it("utilise 17% par defaut quand tvaRate est absent", () => {
    const result = computeDevisTotals({
      items: [{ description: "Forfait", quantity: 1, unit: "u", unitPrice: 100, total: 0 }],
    });

    expect(result.tvaRate).toBe(17);
    expect(result.subtotal).toBe(100);
    expect(result.tvaAmount).toBe(17);
    expect(result.total).toBe(117);
  });

  it("remet les totaux a zero quand il n'y a pas d'items", () => {
    const result = computeDevisTotals({ type: "devis" });

    expect(result.items).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.tvaAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("remet les totaux a zero quand tous les items sont supprimes", () => {
    const withItems = computeDevisTotals({
      tvaRate: 17,
      items: [{ description: "Peinture", quantity: 10, unit: "m2", unitPrice: 12, total: 0 }],
    });
    expect(withItems.total).toBeGreaterThan(0);

    const cleared = computeDevisTotals({ ...withItems, items: [] });
    expect(cleared.subtotal).toBe(0);
    expect(cleared.tvaAmount).toBe(0);
    expect(cleared.total).toBe(0);
  });

  it("ramene a zero les quantites et prix negatifs ou invalides", () => {
    const result = computeDevisTotals({
      items: [
        { description: "Item negatif", quantity: -5, unit: "u", unitPrice: 10, total: 0 },
        { description: "Item NaN", quantity: 2, unit: "u", unitPrice: NaN, total: 0 },
      ],
    });

    expect(result.items?.[0].quantity).toBe(0);
    expect(result.items?.[1].unitPrice).toBe(0);
    expect(result.subtotal).toBe(0);
  });
});
