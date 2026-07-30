import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import NavBar from "@/components/layout/NavBar";

export const metadata: Metadata = {
  title: "AI-Artisan Lux — Devis & Factures",
  description: "Générez des devis et factures conformes pour artisans au Luxembourg via chat IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="h-screen overflow-hidden">
        <LanguageProvider>
          <div className="flex h-full flex-col">
            <NavBar />
            <div className="flex-1 min-h-0">{children}</div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
