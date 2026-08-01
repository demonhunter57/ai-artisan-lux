"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t } from "@/i18n";
import { PriceCatalogItem } from "@/types";
import { UNITS } from "@/constants/units";
import { TVA_RATES, DEFAULT_TVA_RATE } from "@/constants/tva";

function emptyForm() {
  return { reference: "", description: "", unit: UNITS[0] as string, unitPrice: 0, tvaRate: DEFAULT_TVA_RATE as number };
}

export default function BibliothequePage() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<PriceCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/catalog");
      const data = (await res.json()) as { items: PriceCatalogItem[] };
      setItems(data.items ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setActiveTab("create");
  };

  const startEdit = (item: PriceCatalogItem) => {
    setEditingId(item.id ?? null);
    setForm({
      reference: item.reference,
      description: item.description,
      unit: item.unit,
      unitPrice: item.unitPrice,
      tvaRate: item.tvaRate,
    });
    setActiveTab("create");
  };

  const handleDelete = async (item: PriceCatalogItem) => {
    if (!item.id || !window.confirm(t("catalog.confirmDelete", lang))) return;
    await fetch(`/api/catalog/${item.id}`, { method: "DELETE" });
    load();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(editingId ? `/api/catalog/${editingId}` : "/api/catalog", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("save failed");
      setForm(emptyForm());
      setEditingId(null);
      setActiveTab("list");
      await load();
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t("catalog.page.title", lang)}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{t("catalog.page.subtitle", lang)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 max-w-sm">
          <button
            onClick={() => setActiveTab("list")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            {t("catalog.tab.list", lang)}
          </button>
          <button
            onClick={startCreate}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === "create" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            {t("catalog.tab.create", lang)}
          </button>
        </div>

        {activeTab === "list" ? (
          isLoading ? null : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-lavender-100 shadow-sm py-16 text-center">
              <p className="text-sm text-slate-400">{t("catalog.empty", lang)}</p>
            </div>
          ) : (
            <div className="border border-lavender-100 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-lavender-50/60">
                  <tr>
                    <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("catalog.column.reference", lang)}</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("catalog.column.description", lang)}</th>
                    <th className="text-left px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("catalog.column.unit", lang)}</th>
                    <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("catalog.column.unitPrice", lang)}</th>
                    <th className="text-right px-5 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wide">{t("catalog.column.tva", lang)}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-lavender-50">
                  {items.map((item) => (
                    <tr key={item.id ?? item.reference} className="hover:bg-lavender-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-700">{item.reference}</td>
                      <td className="px-5 py-3 text-slate-600">{item.description}</td>
                      <td className="px-5 py-3 text-slate-500">{item.unit}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-700">{item.unitPrice.toFixed(2)} €</td>
                      <td className="px-5 py-3 text-right text-slate-500">{item.tvaRate}%</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(item)} className="text-brand-600 hover:text-brand-700 font-medium mr-4">
                          {t("catalog.action.edit", lang)}
                        </button>
                        <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-600 font-medium">
                          {t("catalog.action.delete", lang)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-lavender-100 shadow-sm p-6 space-y-4 max-w-xl">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? t("catalog.form.title.edit", lang) : t("catalog.form.title.create", lang)}
            </h2>

            <div>
              <label className={labelClass}>{t("catalog.form.reference", lang)}</label>
              <input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>{t("catalog.form.description", lang)}</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={inputClass}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>{t("catalog.form.unit", lang)}</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className={inputClass}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>{t(`unit.${unit}`, lang)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("catalog.form.unitPrice", lang)}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t("catalog.form.tvaRate", lang)}</label>
                <select
                  value={form.tvaRate}
                  onChange={(e) => setForm((f) => ({ ...f, tvaRate: Number(e.target.value) }))}
                  className={inputClass}
                >
                  {TVA_RATES.map((rate) => (
                    <option key={rate.value} value={rate.value}>{rate.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm hover:shadow-md transition-all text-sm active:scale-95"
            >
              {t("catalog.form.save", lang)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
