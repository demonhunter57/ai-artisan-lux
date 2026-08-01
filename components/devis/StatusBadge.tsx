import { Language } from "@/types";
import { t } from "@/i18n";

const STATUS_CONFIG: Record<string, { color: string; key: string }> = {
  draft: { color: "bg-slate-100 text-slate-600", key: "devis.status.draft" },
  sent: { color: "bg-blue-100 text-blue-700", key: "devis.status.sent" },
  validated: { color: "bg-green-100 text-green-700", key: "devis.status.validated" },
  paid: { color: "bg-emerald-100 text-emerald-700", key: "devis.status.paid" },
  overdue: { color: "bg-red-100 text-red-700", key: "devis.status.overdue" },
  cancelled: { color: "bg-slate-200 text-slate-500", key: "devis.status.cancelled" },
};

export default function StatusBadge({ status, lang }: { status: string; lang: Language }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}>
      {t(config.key, lang)}
    </span>
  );
}
