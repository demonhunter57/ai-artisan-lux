"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "@/types";

const LANG_STORAGE_KEY = "ai-artisan-lux:lang";
const VALID_LANGUAGES: Language[] = ["fr", "en", "lb"];

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("fr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && (VALID_LANGUAGES as string[]).includes(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration depuis localStorage, indisponible au rendu serveur
        setLangState(saved as Language);
      }
    } catch {
      // Stockage indisponible (mode prive) - on garde la langue par defaut
    }
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Stockage indisponible - la preference ne sera pas persistee
    }
  };

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage doit etre utilise a l'interieur d'un LanguageProvider");
  }
  return ctx;
}
