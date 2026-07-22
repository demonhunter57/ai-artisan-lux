import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { ChatMessage, ClaudeResponse, Devis, Language } from "@/types";
import { t, tf } from "@/i18n";
import { computeDevisTotals } from "@/lib/devis";
import { DEFAULT_TVA_RATE, REDUCED_TVA_RATE } from "@/constants/tva";
import { format } from "date-fns";
import artisanProfile from "@/data/artisan-profile.json";

const makeWelcome = (lang: Language): ChatMessage => ({
  id: uuid(),
  role: "assistant",
  content: t("chat.welcome", lang),
  action: "none",
  timestamp: new Date().toISOString(),
});

const STORAGE_KEY = "ai-artisan-lux:session";

interface StoredSession {
  messages?: ChatMessage[];
  currentDevis?: Partial<Devis> | null;
  lang?: Language;
}

export function useDevisChat(initialLang: Language) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome(initialLang)]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentDevis, setCurrentDevis] = useState<Partial<Devis> | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoredSession;
        if (saved.messages?.length) setMessages(saved.messages);
        if (saved.currentDevis) setCurrentDevis(saved.currentDevis);
        if (saved.lang) setLang(saved.lang);
      }
    } catch {
      // Session corrompue ou stockage indisponible (mode prive) - on repart d'un etat neuf
    }
    hasRestoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, currentDevis, lang }));
    } catch {
      // Quota depasse ou stockage indisponible - la session ne sera pas persistee
    }
  }, [messages, currentDevis, lang]);

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
    const rate = isRenovation ? REDUCED_TVA_RATE : DEFAULT_TVA_RATE;
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
      isRenovationPrincipal: rate === REDUCED_TVA_RATE,
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

  return {
    lang,
    messages,
    input,
    isTyping,
    currentDevis,
    isGeneratingPdf,
    setInput,
    send,
    handleTvaChoice,
    handleChangeTva,
    handleGeneratePdf,
    handlePrintPdf,
    handleSendDevis,
    handleSignatureSave,
    handleNewChat,
    handleLangChange,
  };
}
