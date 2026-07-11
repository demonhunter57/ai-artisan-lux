"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import ChatInterface from "@/components/ChatInterface";
import DevisPreview from "@/components/DevisPreview";
import { ChatMessage, ClaudeResponse, Devis, Language } from "@/lib/types";
import { t, getLanguageLabel } from "@/lib/i18n";
import artisanProfile from "@/data/artisan-profile.json";
import { format } from "date-fns";

const LANGUAGES: Language[] = ["fr", "en", "lb"];

const makeWelcome = (lang: Language): ChatMessage => ({
  id: uuid(),
  role: "assistant",
  content: t("chat.welcome", lang),
  action: "none",
  timestamp: new Date().toISOString(),
});

export default function HomePage() {
  const [lang, setLang] = useState<Language>("fr");
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome("fr")]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentDevis, setCurrentDevis] = useState<Partial<Devis> | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const addMessage = (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    const full: ChatMessage = {
      ...msg,
      id: uuid(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, full]);
    return full;
  };

  const send = useCallback(async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText) return;
    setInput("");

    addMessage({ role: "user", content: userText });
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history,
          language: lang,
          currentDevis,
          artisanProfile,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: ClaudeResponse = await res.json();

      if (data.devis) {
        const merged: Partial<Devis> = {
          ...currentDevis,
          ...data.devis,
          date: data.devis.date ?? format(new Date(), "yyyy-MM-dd"),
          status: data.devis.status ?? "draft",
        };

        // Recalculate totals if items changed
        if (data.devis.items) {
          const subtotal = data.devis.items.reduce((s, i) => s + i.total, 0);
          const tvaRate = merged.tvaRate ?? 17;
          const tvaAmount = +(subtotal * tvaRate / 100).toFixed(2);
          merged.subtotal = subtotal;
          merged.tvaAmount = tvaAmount;
          merged.total = +(subtotal + tvaAmount).toFixed(2);
          merged.tvaRate = tvaRate;
        }

        setCurrentDevis(merged);
      }

      addMessage({
        role: "assistant",
        content: data.message,
        action: data.action,
        devis: data.devis,
      });
    } catch {
      addMessage({
        role: "assistant",
        content: "Une erreur est survenue. Veuillez réessayer.",
        action: "none",
      });
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, lang, currentDevis]);

  const handleTvaChoice = async (isRenovation: boolean) => {
    const rate = isRenovation ? 3 : 17;
    const label = isRenovation
      ? t("tva.yes", lang)
      : t("tva.no", lang);

    addMessage({ role: "user", content: label });

    if (currentDevis) {
      const subtotal = currentDevis.subtotal ?? 0;
      const tvaAmount = +(subtotal * rate / 100).toFixed(2);
      const updated: Partial<Devis> = {
        ...currentDevis,
        tvaRate: rate,
        tvaAmount,
        total: +(subtotal + tvaAmount).toFixed(2),
        isRenovationPrincipal: isRenovation,
      };
      setCurrentDevis(updated);
    }

    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: label,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          language: lang,
          currentDevis,
          artisanProfile,
        }),
      });
      if (!res.ok) throw new Error();
      const data: ClaudeResponse = await res.json();
      addMessage({ role: "assistant", content: data.message, action: data.action });
    } catch {
      addMessage({
        role: "assistant",
        content: isRenovation
          ? "Parfait ! Taux de TVA 3% appliqué pour la rénovation de logement principal."
          : "D'accord, taux standard 17% appliqué.",
        action: "confirm",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleChangeTva = (rate: number) => {
    if (!currentDevis) return;
    const subtotal = currentDevis.subtotal ?? 0;
    const tvaAmount = +(subtotal * rate / 100).toFixed(2);
    setCurrentDevis({
      ...currentDevis,
      tvaRate: rate,
      tvaAmount,
      total: +(subtotal + tvaAmount).toFixed(2),
      isRenovationPrincipal: rate === 3,
    });
  };

  const handleGeneratePdf = async () => {
    if (!currentDevis || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devis: currentDevis, artisanProfile, language: lang }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const docType = currentDevis.type === "facture" ? "Facture" : "Devis";
      const num = currentDevis.number ?? format(new Date(), "yyyyMMdd");
      a.href = url;
      a.download = `${docType}_${num}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      addMessage({
        role: "assistant",
        content: `Le PDF "${docType}_${num}.pdf" a été généré et téléchargé avec succès !`,
        action: "none",
      });
    } catch {
      addMessage({
        role: "assistant",
        content: "Erreur lors de la génération du PDF. Veuillez réessayer.",
        action: "none",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleNewChat = () => {
    setMessages([makeWelcome(lang)]);
    setCurrentDevis(null);
    setInput("");
  };

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    if (messages.length === 1) {
      setMessages([makeWelcome(newLang)]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">AI-Artisan</p>
              <p className="text-slate-400 text-xs">Luxembourg</p>
            </div>
          </div>
        </div>

        {/* Artisan info */}
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-slate-400 text-xs mb-1">Artisan</p>
          <p className="text-white text-sm font-medium truncate">{artisanProfile.company}</p>
          <p className="text-slate-400 text-xs truncate">{artisanProfile.tvaNumber}</p>
        </div>

        {/* Language selector */}
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-slate-400 text-xs mb-2">Langue / Language</p>
          <div className="flex flex-col gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  lang === l
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                {getLanguageLabel(l)}
              </button>
            ))}
          </div>
        </div>

        {/* TVA reminder */}
        <div className="px-4 py-3 mt-auto border-t border-slate-700">
          <p className="text-slate-500 text-xs leading-relaxed">
            TVA Luxembourg : 17% · 14% · 8% · <span className="text-green-400 font-medium">3%*</span>
            <br />
            <span className="text-slate-600">* Rénovation logement principal</span>
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex min-w-0">
        {/* Chat */}
        <div className="flex-1 min-w-0">
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            input={input}
            lang={lang}
            onInputChange={setInput}
            onSend={() => send()}
            onNewChat={handleNewChat}
            onTvaChoice={handleTvaChoice}
          />
        </div>

        {/* Devis Panel */}
        {currentDevis && (
          <div className="w-96 flex-shrink-0 border-l border-slate-200">
            <DevisPreview
              devis={currentDevis}
              lang={lang}
              onGeneratePdf={handleGeneratePdf}
              onChangeTva={handleChangeTva}
              isGenerating={isGeneratingPdf}
            />
          </div>
        )}
      </div>
    </div>
  );
}
