"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t, tf } from "@/i18n";
import { Devis } from "@/types";
import { REDUCED_TVA_RATE } from "@/constants/tva";
import DevisPreview from "@/components/devis/DevisPreview";
import DocumentForm from "@/components/devis/DocumentForm";
import artisanProfile from "@/data/artisan-profile.json";
import { downloadDevisPdf } from "@/lib/pdfClient";

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "nouveau";
  const { lang } = useLanguage();
  const router = useRouter();

  const [record, setRecord] = useState<Devis | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isEditing, setIsEditing] = useState(isNew);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data: { document?: Devis }) => {
        if (!cancelled) setRecord(data.document ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleSaved = (doc: Devis) => {
    setRecord(doc);
    setIsEditing(false);
    if (isNew) {
      router.replace(`/historique/${doc.id}`);
    }
  };

  const persistPatch = async (patch: Partial<Devis>) => {
    if (!record?.id) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/documents/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { document: Devis };
        setRecord(data.document);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleStatusChange = async (status: Devis["status"]) => {
    if (!record?.id) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/documents/${record.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = (await res.json()) as { document: Devis };
        setRecord(data.document);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleConvert = async () => {
    if (!record?.id) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/documents/${record.id}/convert-to-facture`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { document: Devis };
        router.push(`/historique/${data.document.id}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!record) return;
    const docType = record.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
    await downloadDevisPdf(record, artisanProfile, lang, `${docType}_${record.number}.pdf`);
  };

  const handleSendDevis = () => {
    if (!record?.client?.name) return;
    const docType = record.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
    const docTypeLower = docType.toLowerCase();
    const number = record.number ?? "";
    const subject = encodeURIComponent(tf("devis.emailSubject", lang, { docType, number }));
    const body = tf("devis.emailBody", lang, {
      client: record.client.name,
      docTypeLower,
      number,
      company: artisanProfile.company,
    });
    window.location.href = `mailto:${record.client.email ?? ""}?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-slate-400">...</p>
      </div>
    );
  }

  if (!isNew && !record) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-sm text-slate-500">404</p>
        <Link href="/historique" className="text-brand-600 text-sm font-medium">
          ← {t("document.action.backToHistory", lang)}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link href="/historique" className="text-sm text-slate-500 hover:text-slate-700">
        ← {t("document.action.backToHistory", lang)}
      </Link>

      {isEditing || !record ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <DocumentForm
            initial={record ?? undefined}
            lang={lang}
            onSaved={handleSaved}
            onCancel={record ? () => setIsEditing(false) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {record.type === "devis" && (
              <button
                onClick={handleConvert}
                disabled={isBusy}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
              >
                {t("devis.convertFacture", lang)}
              </button>
            )}
            {record.status === "draft" && (
              <button
                onClick={() => handleStatusChange("sent")}
                disabled={isBusy}
                className="text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40"
              >
                {t("document.status.markSent", lang)}
              </button>
            )}
            {record.type === "facture" && record.status !== "paid" && record.status !== "cancelled" && (
              <button
                onClick={() => handleStatusChange("paid")}
                disabled={isBusy}
                className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-40"
              >
                {t("document.status.markPaid", lang)}
              </button>
            )}
            {record.status !== "cancelled" && (
              <button
                onClick={() => handleStatusChange("cancelled")}
                disabled={isBusy}
                className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
              >
                {t("document.status.markCancelled", lang)}
              </button>
            )}
            <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              {t("document.action.edit", lang)}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
            <DevisPreview
              devis={record}
              lang={lang}
              onGeneratePdf={handleDownload}
              onPrintPdf={handleDownload}
              onSendDevis={handleSendDevis}
              onSaveSignature={(signatureDataUrl, signerName) =>
                persistPatch({ signatureDataUrl, signerName, signedAt: new Date().toISOString() })
              }
              onChangeTva={(rate) => persistPatch({ tvaRate: rate, isRenovationPrincipal: rate === REDUCED_TVA_RATE })}
              onSaveDocument={() => persistPatch({})}
              isGenerating={false}
              isSaving={isBusy}
            />
          </div>
        </div>
      )}
    </div>
  );
}
