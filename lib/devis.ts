import { Devis, DevisItem } from "@/lib/types";

export function normalizeDevisItems(items: DevisItem[]): DevisItem[] {
  return items.map((item) => {
    const total = +(item.quantity * item.unitPrice).toFixed(2);
    return { ...item, total };
  });
}

export function computeDevisTotals(devis: Partial<Devis>): Partial<Devis> {
  if (!devis.items?.length) {
    return devis;
  }

  const items = normalizeDevisItems(devis.items);
  const subtotal = +items.reduce((sum, item) => sum + item.total, 0).toFixed(2);
  const tvaRate = devis.tvaRate ?? 17;
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
