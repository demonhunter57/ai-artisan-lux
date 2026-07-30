"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.chat" },
  { href: "/historique", labelKey: "nav.history" },
  { href: "/journal", labelKey: "nav.journal" },
] as const;

export default function NavBar() {
  const pathname = usePathname();
  const { lang } = useLanguage();

  return (
    <nav className="flex items-center gap-1 px-5 py-2 bg-white/70 backdrop-blur-sm border-b border-lavender-200 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              active ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:text-slate-700 hover:bg-lavender-100"
            }`}
          >
            {t(item.labelKey, lang)}
          </Link>
        );
      })}
    </nav>
  );
}
