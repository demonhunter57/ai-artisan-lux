"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t } from "@/i18n";
import { Devis } from "@/types";
import artisanProfile from "@/data/artisan-profile.json";
import { downloadDevisPdf } from "@/lib/pdfClient";
import StatusBadge from "@/components/devis/StatusBadge";

const PAGE_SIZE = 20;
const STATUSES: Devis["status"][] = ["draft", "sent", "validated", "paid", "overdue", "cancelled"];

function fmtAmount(n: number): string {
  return n.toLocaleString("fr-LU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function HistoriquePage() {
  const { lang } = useLanguage();
  const [documents, setDocuments] = useState<Devis[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "devis" | "facture">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Devis["status"]>("all");
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    try {
      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = (await res.json()) as { documents: Devis[]; total: number };
      setDocuments(data.documents ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, statusFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (doc: Devis) => {
    const docType = doc.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
    await downloadDevisPdf(doc, artisanProfile, lang, `${docType}_${doc.number}.pdf`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t("history.title", lang)}</h1>
          {total > 0 && <p className="text-sm text-slate-400 mt-0.5">{total}</p>}
        </div>

        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setOffset(0);
              setTypeFilter(e.target.value as typeof typeFilter);
            }}
            className="rounded-full border border-lavender-200 px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">{t("history.filter.type.all", lang)}</option>
            <option value="devis">{t("history.filter.type.devis", lang)}</option>
            <option value="facture">{t("history.filter.type.facture", lang)}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setOffset(0);
              setStatusFilter(e.target.value as typeof statusFilter);
            }}
            className="rounded-full border border-lavender-200 px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">{t("history.filter.status.all", lang)}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`devis.status.${s}`, lang)}</option>
            ))}
          </select>
        </div>

        {isLoading ? null : documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-lavender-100 shadow-sm py-16 text-center">
            <p className="text-sm text-slate-400">{t("history.empty", lang)}</p>
          </div>
        ) : (
          <div className="border border-lavender-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-lavender-50/60">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("history.column.number", lang)}</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("history.column.client", lang)}</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("history.column.date", lang)}</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("history.column.total", lang)}</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("history.column.status", lang)}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-lavender-50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-lavender-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-700">{doc.number}</td>
                    <td className="px-5 py-3 text-slate-600">{doc.client.name}</td>
                    <td className="px-5 py-3 text-slate-500">{doc.date}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">{fmtAmount(doc.total)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={doc.status} lang={lang} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Link href={`/historique/${doc.id}`} className="text-brand-600 hover:text-brand-700 font-medium mr-4">
                        {t("history.action.view", lang)}
                      </Link>
                      <button onClick={() => handleDownload(doc)} className="text-slate-400 hover:text-slate-600 font-medium">
                        {t("history.action.downloadPdf", lang)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              ← {t("history.pagination.prev", lang)}
            </button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              {t("history.pagination.next", lang)} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
