"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { t } from "@/i18n";
import { Devis } from "@/types";
import DocumentForm from "@/components/devis/DocumentForm";

export default function CreationPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const handleSaved = (doc: Devis) => {
    router.push(`/historique/${doc.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t("creation.title", lang)}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{t("creation.subtitle", lang)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-lavender-100 shadow-sm p-6">
          <DocumentForm lang={lang} onSaved={handleSaved} onCancel={() => router.push("/historique")} />
        </div>
      </div>
    </div>
  );
}
