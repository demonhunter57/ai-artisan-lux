"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.chat" },
  { href: "/historique", labelKey: "nav.history" },
  { href: "/bibliotheque", labelKey: "nav.catalog" },
  { href: "/journal", labelKey: "nav.journal" },
] as const;

export default function NavBar() {
  const pathname = usePathname();
  const { lang } = useLanguage();

  return (
    <nav className="flex items-center gap-1 px-5 py-2.5 bg-white/80 backdrop-blur-md border-b border-lavender-200/70 text-sm shadow-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-lavender-100"
            }`}
          >
            {t(item.labelKey, lang)}
          </Link>
        );
      })}
    </nav>
  );
}
