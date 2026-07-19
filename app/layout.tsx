import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Artisan Lux — Devis & Factures",
  description: "Générez des devis et factures conformes pour artisans au Luxembourg via chat IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
