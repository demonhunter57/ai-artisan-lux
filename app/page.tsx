"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import ChatInterface from "@/components/ChatInterface";
import DevisPreview from "@/components/DevisPreview";
import { ChatMessage, ClaudeResponse, Devis, Language, PriceCatalog } from "@/lib/types";
import { t, tf } from "@/lib/i18n";
import artisanProfile from "@/data/artisan-profile.json";
import priceCatalogData from "@/data/prestations-prix.json";
import { format } from "date-fns";
import { computeDevisTotals } from "@/lib/devis";

const LANGUAGES: Language[] = ["fr", "en", "lb"];
const priceCatalog = priceCatalogData as PriceCatalog;

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

    const userHistoryMessage = { role: "user", content: userText } as const;
    addMessage(userHistoryMessage);
    setIsTyping(true);

    try {
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        userHistoryMessage,
      ];

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
        const merged = computeDevisTotals({
          ...currentDevis,
          ...data.devis,
          date: data.devis.date ?? format(new Date(), "yyyy-MM-dd"),
          status: data.devis.status ?? "draft",
        });

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
        content: t("chat.error.generic", lang),
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

    const userHistoryMessage = { role: "user", content: label } as const;
    addMessage(userHistoryMessage);

    const updatedDevis = currentDevis
      ? computeDevisTotals({
        ...currentDevis,
        tvaRate: rate,
        isRenovationPrincipal: isRenovation,
      })
      : null;

    if (updatedDevis) {
      setCurrentDevis(updatedDevis);
    }

    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: label,
          history: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            userHistoryMessage,
          ],
          language: lang,
          currentDevis: updatedDevis ?? currentDevis,
          artisanProfile,
        }),
      });
      if (!res.ok) throw new Error();
      const data: ClaudeResponse = await res.json();

      if (data.devis) {
        const nextDevis = data.devis;
        setCurrentDevis((prev) => computeDevisTotals({
          ...prev,
          ...nextDevis,
          status: nextDevis.status ?? prev?.status ?? "draft",
        }));
      }

      addMessage({ role: "assistant", content: data.message, action: data.action });
    } catch {
      addMessage({
        role: "assistant",
        content: isRenovation
          ? t("chat.tva.confirm.reduced", lang)
          : t("chat.tva.confirm.standard", lang),
        action: "confirm",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleChangeTva = (rate: number) => {
    if (!currentDevis) return;
    setCurrentDevis(computeDevisTotals({
      ...currentDevis,
      tvaRate: rate,
      isRenovationPrincipal: rate === 3,
    }));
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
      const docType = currentDevis.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
      const num = currentDevis.number ?? format(new Date(), "yyyyMMdd");
      a.href = url;
      a.download = `${docType}_${num}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      addMessage({
        role: "assistant",
        content: tf("chat.pdf.success", lang, { filename: `${docType}_${num}.pdf` }),
        action: "none",
      });
    } catch {
      addMessage({
        role: "assistant",
        content: t("chat.pdf.error", lang),
        action: "none",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const buildPdfBlob = async () => {
    if (!currentDevis) return null;

    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devis: currentDevis, artisanProfile, language: lang }),
    });

    if (!res.ok) {
      throw new Error("PDF generation failed");
    }

    return res.blob();
  };

  const handlePrintPdf = async () => {
    if (!currentDevis || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const blob = await buildPdfBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendDevis = () => {
    if (!currentDevis?.client?.name) return;

    const docType = currentDevis.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
    const docTypeLower = docType.toLowerCase();
    const number = currentDevis.number ?? format(new Date(), "yyyyMMdd");
    const subject = encodeURIComponent(tf("devis.emailSubject", lang, { docType, number }));
    const body = tf("devis.emailBody", lang, {
      client: currentDevis.client.name,
      docTypeLower,
      number,
      company: artisanProfile.company,
    });
    const email = currentDevis.client.email ?? "";

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSignatureSave = (signatureDataUrl: string, signerName: string) => {
    if (!currentDevis) return;

    setCurrentDevis({
      ...currentDevis,
      signatureDataUrl,
      signerName,
      signedAt: new Date().toISOString(),
    });
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
    <div className="flex h-screen bg-lavender-100">
      {/* Column: header + chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${currentDevis ? "" : "max-w-[760px] w-full mx-auto md:my-3 md:rounded-[28px] md:border md:border-lavender-200 md:overflow-hidden md:bg-lavender-100"}`}>

        {/* ── Top header ── */}
        <header className="flex items-center justify-between px-5 py-3.5 md:px-7 md:pt-5 flex-shrink-0">
          {/* Avatar profil artisan */}
          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>

          {/* Wordmark */}
          <h1 className="text-xl font-bold italic text-brand-500 tracking-tight">AI-Artisan</h1>

          {/* Language cycle pill */}
          <button
            onClick={() => handleLangChange(LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length])}
            className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-white shadow-sm rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            {lang.toUpperCase()}
          </button>
        </header>

        {/* ── Chat ── */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            input={input}
            lang={lang}
            priceCatalog={priceCatalog}
            onInputChange={setInput}
            onSend={send}
            onNewChat={handleNewChat}
            onTvaChoice={handleTvaChoice}
          />
        </div>
      </div>

      {/* ── Devis panel (desktop) ── */}
      {currentDevis && (
        <div className="hidden lg:flex w-96 flex-shrink-0 flex-col bg-white border-l border-lavender-200 shadow-lg">
          <DevisPreview
            devis={currentDevis}
            lang={lang}
            onGeneratePdf={handleGeneratePdf}
            onPrintPdf={handlePrintPdf}
            onSendDevis={handleSendDevis}
            onSaveSignature={handleSignatureSave}
            onChangeTva={handleChangeTva}
            isGenerating={isGeneratingPdf}
          />
        </div>
      )}
    </div>
  );
}
