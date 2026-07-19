import type { Language } from "@/types";
import { fr } from "./fr";
import { en } from "./en";
import { lb } from "./lb";

const translations: Record<Language, Record<string, string>> = { fr, en, lb };

export function t(key: string, lang: Language): string {
  return translations[lang]?.[key] ?? translations["fr"][key] ?? key;
}

export function tf(key: string, lang: Language, vars: Record<string, string | number>): string {
  let value = t(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    value = value.split(`{${k}}`).join(String(v));
  }
  return value;
}

export function getLanguageLabel(lang: Language): string {
  const labels: Record<Language, string> = { fr: "Français", en: "English", lb: "Lëtzebuergesch" };
  return labels[lang];
}
