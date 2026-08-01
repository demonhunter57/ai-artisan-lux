"use client";

import { useState } from "react";
import { Devis, DevisItem, Language } from "@/types";
import { t } from "@/i18n";
import { TVA_RATES, DEFAULT_TVA_RATE, REDUCED_TVA_RATE } from "@/constants/tva";
import { computeDevisTotals } from "@/lib/devis";

interface Props {
  initial?: Partial<Devis>;
  lang: Language;
  onSaved: (doc: Devis) => void;
  onCancel?: () => void;
}

const STATUSES: Devis["status"][] = ["draft", "sent", "validated", "paid", "overdue", "cancelled"];

function emptyItem(): DevisItem {
  return { description: "", quantity: 1, unit: "u", unitPrice: 0, total: 0 };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DocumentForm({ initial, lang, onSaved, onCancel }: Props) {
  const [type, setType] = useState<Devis["type"]>(initial?.type ?? "devis");
  const [status, setStatus] = useState<Devis["status"]>(initial?.status ?? "draft");
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [client, setClient] = useState({
    name: initial?.client?.name ?? "",
    address: initial?.client?.address ?? "",
    city: initial?.client?.city ?? "",
    postal: initial?.client?.postal ?? "",
    country: initial?.client?.country ?? "",
    phone: initial?.client?.phone ?? "",
    email: initial?.client?.email ?? "",
    tvaNumber: initial?.client?.tvaNumber ?? "",
  });
  const [items, setItems] = useState<DevisItem[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [tvaRate, setTvaRate] = useState<number>(initial?.tvaRate ?? DEFAULT_TVA_RATE);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = computeDevisTotals({ items, tvaRate });

  const updateItem = (index: number, patch: Partial<DevisItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const isEdit = Boolean(initial?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      type,
      status,
      date,
      client,
      items,
      tvaRate,
      isRenovationPrincipal: tvaRate === REDUCED_TVA_RATE,
      notes: notes || undefined,
      language: lang,
    };

    try {
      const res = await fetch(isEdit ? `/api/documents/${initial!.id}` : "/api/documents", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("save failed");
      const { document } = (await res.json()) as { document: Devis };
      onSaved(document);
    } catch {
      setError(t("chat.error.generic", lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">
        {isEdit ? t("document.form.title.edit", lang) : t("document.form.title.create", lang)}
      </h2>

      {/* Type / Statut / Date */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>{t("history.filter.type", lang)}</label>
          <select value={type} onChange={(e) => setType(e.target.value as Devis["type"])} className={inputClass}>
            <option value="devis">{t("document.form.type.devis", lang)}</option>
            <option value="facture">{t("document.form.type.facture", lang)}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("history.column.status", lang)}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Devis["status"])} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`devis.status.${s}`, lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("devis.date", lang)}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Client */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{t("devis.client", lang)}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>{t("settings.company", lang)}</label>
            <input
              value={client.name}
              onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>{t("settings.address", lang)}</label>
            <input
              value={client.address}
              onChange={(e) => setClient((c) => ({ ...c, address: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.postal", lang)}</label>
            <input
              value={client.postal}
              onChange={(e) => setClient((c) => ({ ...c, postal: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.city", lang)}</label>
            <input
              value={client.city}
              onChange={(e) => setClient((c) => ({ ...c, city: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.email", lang)}</label>
            <input
              type="email"
              value={client.email}
              onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.phone", lang)}</label>
            <input
              value={client.phone}
              onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("devis.items", lang)}</p>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + {t("document.form.addItem", lang)}
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder={t("devis.description", lang)}
                className={`${inputClass} col-span-5`}
              />
              <input
                type="number"
                step="any"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                placeholder={t("devis.qty", lang)}
                className={`${inputClass} col-span-2`}
              />
              <input
                value={item.unit}
                onChange={(e) => updateItem(index, { unit: e.target.value })}
                placeholder={t("devis.unit", lang)}
                className={`${inputClass} col-span-2`}
              />
              <input
                type="number"
                step="any"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                placeholder={t("devis.unitPrice", lang)}
                className={`${inputClass} col-span-2`}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                aria-label={t("document.form.removeItem", lang)}
                className="col-span-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* TVA + totaux */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
        <div>
          <label className={labelClass}>{t("devis.tva", lang)}</label>
          <select value={tvaRate} onChange={(e) => setTvaRate(Number(e.target.value))} className={inputClass}>
            {TVA_RATES.map((rate) => (
              <option key={rate.value} value={rate.value}>{rate.label}</option>
            ))}
          </select>
        </div>
        <div className="text-right text-sm space-y-1">
          <p className="text-slate-500">{t("devis.subtotal", lang)}: <span className="font-medium text-slate-700">{totals.subtotal?.toFixed(2)} €</span></p>
          <p className="text-slate-500">{t("devis.tva", lang)}: <span className="font-medium text-slate-700">{totals.tvaAmount?.toFixed(2)} €</span></p>
          <p className="font-bold text-slate-900">{t("devis.totalTTC", lang)}: {totals.total?.toFixed(2)} €</p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>{t("devis.notes", lang)}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !client.name.trim() || items.length === 0}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm hover:shadow-md transition-all text-sm active:scale-95"
        >
          {isSubmitting ? t("devis.generating", lang) : t("document.form.save", lang)}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t("document.action.backToHistory", lang)}
          </button>
        )}
      </div>
    </form>
  );
}
