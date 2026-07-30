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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t("journal.title", lang)}</h1>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
        {t("journal.disclaimer", lang)}
      </div>

      {isLoading ? null : (
        <>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("journal.balances.title", lang)}
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">{t("journal.column.account", lang)}</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">{t("journal.column.debit", lang)}</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">{t("journal.column.credit", lang)}</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">{t("journal.balances.balance", lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balances.map((b) => (
                    <tr key={b.code}>
                      <td className="px-4 py-2 text-slate-700">{b.code} — {b.name}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{fmtAmount(b.debitTotal)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{fmtAmount(b.creditTotal)}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-800">{fmtAmount(b.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">{t("journal.title", lang)}</h2>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">{t("journal.empty", lang)}</p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 text-xs">
                      <span className="font-medium text-slate-700">{entry.label}</span>
                      <span className="text-slate-400">{entry.date}</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {entry.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-1.5 text-slate-600">{line.accountCode} — {line.accountName}</td>
                            <td className="px-4 py-1.5 text-right text-slate-700 w-28">
                              {line.debit > 0 ? fmtAmount(line.debit) : ""}
                            </td>
                            <td className="px-4 py-1.5 text-right text-slate-700 w-28">
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
  );
}
