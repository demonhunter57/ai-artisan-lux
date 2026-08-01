export const UNITS = ["m2", "ml", "m3", "h", "j", "u", "forfait"] as const;

export type Unit = (typeof UNITS)[number];
