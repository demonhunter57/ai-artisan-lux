import type { ArtisanProfile, Devis, Language } from "@/types";

export async function downloadDevisPdf(
  devis: Partial<Devis>,
  artisanProfile: ArtisanProfile,
  language: Language,
  filename: string
): Promise<void> {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ devis, artisanProfile, language }),
  });

  if (!res.ok) {
    throw new Error("PDF generation failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
