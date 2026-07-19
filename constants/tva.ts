import type { TVARate } from "@/types";

export const DEFAULT_TVA_RATE: TVARate = 17;
export const REDUCED_TVA_RATE: TVARate = 3;

export const TVA_RATES: { value: TVARate; label: string; description: string }[] = [
  { value: 3, label: "3%", description: "Super-réduit — Rénovation logement principal" },
  { value: 8, label: "8%", description: "Réduit — Travaux spécifiques" },
  { value: 14, label: "14%", description: "Intermédiaire" },
  { value: 17, label: "17%", description: "Normal — Taux standard" },
];
