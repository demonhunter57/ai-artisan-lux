"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("Unhandled client error", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-lavender-100 px-6 text-center">
      <h1 className="text-xl font-bold text-slate-800">Une erreur inattendue est survenue</h1>
      <p className="max-w-md text-sm text-slate-500">
        Veuillez réessayer. Si le problème persiste, rechargez la page.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
