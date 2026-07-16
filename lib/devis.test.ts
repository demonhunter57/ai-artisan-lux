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

  it("retourne l'objet tel quel s'il n'y a pas d'items", () => {
    const input = { type: "devis" as const };
    const result = computeDevisTotals(input);

    expect(result).toEqual(input);
  });
});
