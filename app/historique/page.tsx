"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t } from "@/i18n";
import { Devis } from "@/types";
import artisanProfile from "@/data/artisan-profile.json";
import { downloadDevisPdf } from "@/lib/pdfClient";

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
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t("history.title", lang)}</h1>
        <Link
          href="/historique/nouveau"
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
        >
          + {t("history.new", lang)}
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => {
            setOffset(0);
            setTypeFilter(e.target.value as typeof typeFilter);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
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
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="all">{t("history.filter.status.all", lang)}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`devis.status.${s}`, lang)}</option>
          ))}
        </select>
      </div>

      {isLoading ? null : documents.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">{t("history.empty", lang)}</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">{t("history.column.number", lang)}</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">{t("history.column.client", lang)}</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">{t("history.column.date", lang)}</th>
                <th className="text-right px-4 py-2 text-slate-500 font-medium">{t("history.column.total", lang)}</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">{t("history.column.status", lang)}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{doc.number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{doc.client.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{doc.date}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{fmtAmount(doc.total)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {t(`devis.status.${doc.status}`, lang)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Link href={`/historique/${doc.id}`} className="text-brand-600 hover:text-brand-700 font-medium mr-3">
                      {t("history.action.view", lang)}
                    </Link>
                    <button onClick={() => handleDownload(doc)} className="text-slate-500 hover:text-slate-700 font-medium">
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
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t("history.pagination.prev", lang)}
          </button>
          <button
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t("history.pagination.next", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
