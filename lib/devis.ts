import { format } from "date-fns";
import { Devis, DevisItem } from "@/types";
import { DEFAULT_TVA_RATE } from "@/constants/tva";

function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function normalizeDevisItems(items: DevisItem[]): DevisItem[] {
  return items.map((item) => {
    const quantity = clampNonNegative(item.quantity);
    const unitPrice = clampNonNegative(item.unitPrice);
    const total = +(quantity * unitPrice).toFixed(2);
    return { ...item, quantity, unitPrice, total };
  });
}

export function computeDevisTotals(devis: Partial<Devis>): Partial<Devis> {
  const items = normalizeDevisItems(devis.items ?? []);
  const subtotal = +items.reduce((sum, item) => sum + item.total, 0).toFixed(2);
  const tvaRate = devis.tvaRate ?? DEFAULT_TVA_RATE;
  const tvaAmount = +(subtotal * tvaRate / 100).toFixed(2);

  return {
    ...devis,
    items,
    subtotal,
    tvaRate,
    tvaAmount,
    total: +(subtotal + tvaAmount).toFixed(2),
  };
}

export function generateDocumentNumber(type: Devis["type"], date: Date = new Date()): string {
  const prefix = type === "facture" ? "F" : "D";
  return `${prefix}-${format(date, "yyyyMMdd-HHmm")}`;
}
