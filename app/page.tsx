"use client";

import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import DevisPreview from "@/components/devis/DevisPreview";
import { PriceCatalog } from "@/types";
import priceCatalogData from "@/data/prestations-prix.json";
import { LANGUAGES } from "@/constants/languages";
import { useDevisChat } from "@/hooks/useDevisChat";
import { t } from "@/i18n";

const priceCatalog = priceCatalogData as PriceCatalog;

export default function HomePage() {
  const {
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
  } = useDevisChat("fr");

  const [showMobileDevis, setShowMobileDevis] = useState(false);
  const [hadDevis, setHadDevis] = useState(false);

  // Ouvre automatiquement le tiroir mobile la premiere fois qu'un devis apparait
  const hasDevisNow = Boolean(currentDevis);
  if (hasDevisNow !== hadDevis) {
    setHadDevis(hasDevisNow);
    if (hasDevisNow) {
      setShowMobileDevis(true);
    }
  }

  const onNewChat = () => {
    handleNewChat();
    setShowMobileDevis(false);
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
            onNewChat={onNewChat}
            onTvaChoice={handleTvaChoice}
          />
        </div>

        {/* ── Bouton flottant devis (mobile) ── */}
        {currentDevis && !showMobileDevis && (
          <button
            onClick={() => setShowMobileDevis(true)}
            className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-3 rounded-full shadow-lg active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("devis.title", lang)}
          </button>
        )}
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

      {/* ── Devis en tiroir plein ecran (mobile) ── */}
      {currentDevis && showMobileDevis && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <span className="text-sm font-semibold text-slate-700">{t("devis.title", lang)}</span>
            <button
              onClick={() => setShowMobileDevis(false)}
              aria-label={t("devis.close", lang)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
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
        </div>
      )}
    </div>
  );
}
