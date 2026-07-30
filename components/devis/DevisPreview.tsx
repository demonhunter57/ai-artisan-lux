"use client";

import { useState } from "react";
import Image from "next/image";
import { Devis, Language } from "@/types";
import { t } from "@/i18n";
import { DEFAULT_TVA_RATE, TVA_RATES } from "@/constants/tva";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import SignaturePad from "./SignaturePad";

interface Props {
  devis: Partial<Devis>;
  lang: Language;
  onGeneratePdf: () => void;
  onPrintPdf: () => void;
  onSendDevis: () => void;
  onSaveSignature: (signatureDataUrl: string, signerName: string) => void;
  onChangeTva: (rate: number) => void;
  onSaveDocument: () => void;
  isGenerating: boolean;
  isSaving: boolean;
}

const localeMap = { fr, en: enUS, lb: fr };

export default function DevisPreview({
  devis,
  lang,
  onGeneratePdf,
  onPrintPdf,
  onSendDevis,
  onSaveSignature,
  onChangeTva,
  onSaveDocument,
  isGenerating,
  isSaving,
}: Props) {
  const dateLocale = localeMap[lang];
  const [activeTab, setActiveTab] = useState<"actions" | "signature">("actions");

  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: dateLocale }) : "—";

  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("fr-LU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
      : "—";

  const docLabel = devis.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
  const tvaOptions = TVA_RATES.map((rate) => ({
    value: rate.value,
    label: t(`devis.tva.option.${rate.value}`, lang),
  }));

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("devis.title", lang)}
          </span>
          {devis.status && (
            <StatusBadge status={devis.status} lang={lang} />
          )}
        </div>
        <span className="text-sm font-bold text-brand-700">{docLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {devis.number && (
            <div>
              <span className="text-slate-400 text-xs">{t("devis.number", lang)}</span>
              <p className="font-semibold">{devis.number}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 text-xs">{t("devis.date", lang)}</span>
            <p className="font-semibold">{formatDate(devis.date)}</p>
          </div>
          {devis.type === "devis" && devis.validUntil && (
            <div>
              <span className="text-slate-400 text-xs">{t("devis.validUntil", lang)}</span>
              <p className="font-semibold">{formatDate(devis.validUntil)}</p>
            </div>
          )}
          {devis.type === "facture" && devis.dueDate && (
            <div>
              <span className="text-slate-400 text-xs">{t("devis.dueDate", lang)}</span>
              <p className="font-semibold">{formatDate(devis.dueDate)}</p>
            </div>
          )}
        </div>

        {/* Client */}
        {devis.client?.name && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("devis.client", lang)}
            </p>
            <p className="font-semibold text-slate-800">{devis.client.name}</p>
            {devis.client.address && (
              <p className="text-sm text-slate-600">{devis.client.address}</p>
            )}
            {(devis.client.postal || devis.client.city) && (
              <p className="text-sm text-slate-600">
                {[devis.client.postal, devis.client.city].filter(Boolean).join(" ")}
              </p>
            )}
            {devis.client.email && (
              <p className="text-sm text-slate-500">{devis.client.email}</p>
            )}
            {devis.client.phone && (
              <p className="text-sm text-slate-500">{devis.client.phone}</p>
            )}
          </div>
        )}

        {/* Items table */}
        {devis.items && devis.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("devis.items", lang)}
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">
                      {t("devis.description", lang)}
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium w-16">
                      {t("devis.qty", lang)}
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium w-20">
                      {t("devis.unitPrice", lang)}
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium w-24">
                      {t("devis.total", lang)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devis.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">
                        {item.description}
                        {item.unit && (
                          <span className="text-slate-400 text-xs ml-1">/ {item.unit}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{fmt(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">
                        {fmt(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals */}
        {typeof devis.subtotal === "number" && (
          <div className="space-y-2">
            {/* TVA selector */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{t("devis.tva", lang)}</span>
              <select
                value={devis.tvaRate ?? DEFAULT_TVA_RATE}
                onChange={(e) => onChangeTva(Number(e.target.value))}
                className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {tvaOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{t("devis.subtotal", lang)}</span>
                <span>{fmt(devis.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>{t("devis.tva", lang)} {devis.tvaRate ?? DEFAULT_TVA_RATE}%</span>
                <span>{fmt(devis.tvaAmount)}</span>
              </div>
              {devis.isRenovationPrincipal && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 rounded px-2 py-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t("devis.tva.renovationNote", lang)}
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>{t("devis.totalTTC", lang)}</span>
                <span>{fmt(devis.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {devis.signatureDataUrl && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("devis.signatureBlock", lang)}
            </p>
            <div className="relative h-20 rounded-lg bg-white border border-slate-200 p-3">
              <Image
                src={devis.signatureDataUrl}
                alt={t("devis.signatureBlock", lang)}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              {devis.signerName && <p>{devis.signerName}</p>}
              {devis.signedAt && <p>{t("devis.signatureDate", lang)}: {formatDate(devis.signedAt)}</p>}
            </div>
          </div>
        )}

        {devis.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium text-xs mb-1">{t("devis.notes", lang)}</p>
            {devis.notes}
          </div>
        )}
      </div>

      {/* Actions / Signature */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("actions")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "actions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            {t("devis.actionsTab", lang)}
          </button>
          <button
            onClick={() => setActiveTab("signature")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "signature" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            {t("devis.signatureTab", lang)}
          </button>
        </div>

        {activeTab === "actions" ? (
          <div className="space-y-2">
            <button
              onClick={onSaveDocument}
              disabled={isSaving || !devis.client?.name || !devis.items?.length}
              className="w-full flex items-center justify-center gap-2 border border-brand-200 bg-brand-50 hover:bg-brand-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-brand-700 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-8H7v8M7 3v5h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              {isSaving ? t("devis.generating", lang) : t("chat.save", lang)}
            </button>
            <p className="text-xs text-slate-400">{t("chat.saveHint", lang)}</p>

            <button
              onClick={onSendDevis}
              disabled={!devis.client?.name}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              {t("devis.send", lang)}
            </button>
            <p className="text-xs text-slate-400">{t("devis.sendHint", lang)}</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onPrintPdf}
                disabled={isGenerating || !devis.client?.name || !devis.items?.length}
                className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                </svg>
                {t("devis.print", lang)}
              </button>

              <button
                onClick={onGeneratePdf}
                disabled={isGenerating || !devis.client?.name || !devis.items?.length}
                className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("devis.generating", lang)}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("devis.downloadPdf", lang)}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <SignaturePad
            lang={lang}
            signatureDataUrl={devis.signatureDataUrl}
            initialSignerName={devis.signerName}
            onSave={onSaveSignature}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, lang }: { status: string; lang: Language }) {
  const config: Record<string, { color: string; key: string }> = {
    draft:     { color: "bg-slate-100 text-slate-600",   key: "devis.status.draft" },
    sent:      { color: "bg-blue-100 text-blue-700",     key: "devis.status.sent" },
    validated: { color: "bg-green-100 text-green-700",   key: "devis.status.validated" },
    paid:      { color: "bg-emerald-100 text-emerald-700", key: "devis.status.paid" },
    overdue:   { color: "bg-red-100 text-red-700",       key: "devis.status.overdue" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>
      {t(c.key, lang)}
    </span>
  );
}
