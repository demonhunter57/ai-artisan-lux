"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t } from "@/i18n";

interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  label: string;
  documentId: string | null;
  eventType: string;
  lines: JournalLine[];
}

interface AccountBalance {
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

function fmtAmount(n: number): string {
  return n.toLocaleString("fr-LU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function JournalPage() {
  const { lang } = useLanguage();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/journal")
      .then((res) => res.json())
      .then((data: { entries: JournalEntry[]; accountBalances: AccountBalance[] }) => {
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setBalances(data.accountBalances ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t("journal.title", lang)}</h1>

        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 shadow-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{t("journal.disclaimer", lang)}</span>
        </div>

        {isLoading ? null : (
          <>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                {t("journal.balances.title", lang)}
              </h2>
              <div className="border border-lavender-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-lavender-50/60">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("journal.column.account", lang)}</th>
                      <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("journal.column.debit", lang)}</th>
                      <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("journal.column.credit", lang)}</th>
                      <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("journal.balances.balance", lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lavender-50">
                    {balances.map((b) => (
                      <tr key={b.code} className="hover:bg-lavender-50/50 transition-colors">
                        <td className="px-5 py-3 text-slate-700">{b.code} — {b.name}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{fmtAmount(b.debitTotal)}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{fmtAmount(b.creditTotal)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmtAmount(b.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">{t("journal.title", lang)}</h2>
              {entries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-lavender-100 shadow-sm py-16 text-center">
                  <p className="text-sm text-slate-400">{t("journal.empty", lang)}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="border border-lavender-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-5 py-2.5 bg-lavender-50/60 text-xs">
                        <span className="font-semibold text-slate-700">{entry.label}</span>
                        <span className="text-slate-400">{entry.date}</span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-lavender-50">
                          {entry.lines.map((line) => (
                            <tr key={line.id}>
                              <td className="px-5 py-2 text-slate-600">{line.accountCode} — {line.accountName}</td>
                              <td className="px-5 py-2 text-right text-slate-700 w-28 tabular-nums">
                                {line.debit > 0 ? fmtAmount(line.debit) : ""}
                              </td>
                              <td className="px-5 py-2 text-right text-slate-700 w-28 tabular-nums">
                                {line.credit > 0 ? fmtAmount(line.credit) : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
