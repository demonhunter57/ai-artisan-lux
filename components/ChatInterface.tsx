"use client";

import { Fragment, useEffect, useRef } from "react";
import { ChatMessage, Language, PriceCatalog } from "@/lib/types";
import { t, tf } from "@/lib/i18n";
import { format } from "date-fns";

interface Props {
  messages: ChatMessage[];
  isTyping: boolean;
  input: string;
  lang: Language;
  priceCatalog: PriceCatalog;
  onInputChange: (v: string) => void;
  onSend: (text?: string) => void;
  onNewChat: () => void;
  onTvaChoice: (yes: boolean) => void;
}

const QUICK_ACTIONS = [
  {
    labelKey: "chat.quick.newClient",
    messageKey: "chat.quick.newClientPrompt",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    variant: "teal" as const,
  },
  {
    labelKey: "chat.quick.recentClients",
    messageKey: "chat.quick.recentClientsPrompt",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    variant: "white" as const,
  },
];

const NEXT_STEPS = [
  {
    labelKey: "chat.next.quote",
    messageKey: "chat.next.quotePrompt",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "bg-brand-100 text-brand-600",
  },
  {
    labelKey: "chat.next.invoice",
    messageKey: "chat.next.invoicePrompt",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: "bg-teal-100 text-teal-600",
  },
];

export default function ChatInterface({
  messages, isTyping, input, lang, priceCatalog,
  onInputChange, onSend, onNewChat, onTvaChoice,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitial = messages.length === 1 && messages[0].role === "assistant";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const lastMsg = messages[messages.length - 1];
  const showTvaChoice = lastMsg?.role === "assistant" && lastMsg?.action === "ask_tva";

  return (
    <div className="flex flex-col h-full md:px-3">

      {/* ── Zone messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 md:px-5 space-y-4">
        {messages.map((msg, index) => (
          <MessageBubble key={msg.id} msg={msg} isWelcome={isInitial && index === 0} />
        ))}

        {/* ── Cartes d'accueil (état initial) ── */}
        {isInitial && (
          <div className="chat-bubble-enter space-y-4 pt-1">
            <p className="text-center text-xs font-semibold tracking-widest uppercase text-slate-400">
              {t("chat.status.online", lang)}
            </p>

            <div className="flex gap-3 flex-wrap">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.labelKey}
                  onClick={() => onSend(t(action.messageKey, lang))}
                  className={`flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm transition-all hover:shadow-md active:scale-95 ${
                    action.variant === "teal"
                      ? "bg-gradient-to-r from-teal-300 to-teal-400 text-teal-900"
                      : "bg-lavender-200/70 text-slate-700 border border-lavender-200"
                  }`}
                >
                  {action.icon}
                  {t(action.labelKey, lang)}
                </button>
              ))}
            </div>

            <div className="bg-lavender-200/60 rounded-3xl p-5 md:p-6 flex items-start justify-between gap-4 border border-lavender-200/70 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                    {t("chat.tax.regime", lang)}
                  </span>
                </div>
                <h3 className="text-2xl leading-tight font-bold text-slate-800 mb-2">{t("chat.tax.title", lang)}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t("chat.tax.description", lang)}
                </p>
              </div>
              <div className="flex-shrink-0 text-slate-200">
                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h1v11H4V10zm5 0h1v11H9V10zm5 0h1v11h-1V10zm5 0h1v11h-1V10z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-lavender-200" />
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                  {t("chat.nextsteps", lang)}
                </span>
                <div className="flex-1 h-px bg-lavender-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {NEXT_STEPS.map((step) => (
                  <button
                    key={step.labelKey}
                    onClick={() => onSend(t(step.messageKey, lang))}
                    className="bg-white rounded-3xl p-4 md:p-5 text-left flex flex-col gap-3 shadow-sm border border-lavender-100 hover:shadow-md hover:border-lavender-200 transition-all active:scale-95 min-h-[132px]"
                  >
                    <div className={`w-11 h-11 ${step.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      {step.icon}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{t(step.labelKey, lang)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 md:p-5 shadow-sm border border-lavender-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t("catalog.title", lang)}</p>
                  <p className="text-xs text-slate-400">{t("catalog.subtitle", lang)}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {tf("catalog.updated", lang, { date: priceCatalog.updatedAt })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {priceCatalog.items.map((item) => (
                  <button
                    key={item.reference}
                    onClick={() => onSend(tf("catalog.itemPrompt", lang, {
                      description: item.description,
                      unit: item.unit,
                      price: item.unitPrice.toFixed(2),
                    }))}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-lavender-100 bg-lavender-50/50 px-4 py-3 text-left hover:bg-lavender-100/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.description}</p>
                      <p className="text-xs text-slate-400">{item.reference} • {item.unit}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">{item.unitPrice.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-1 pb-2">
              <button
                onClick={onNewChat}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("chat.new", lang)}
              </button>
            </div>
          </div>
        )}

        {/* ── Indicateur de frappe ── */}
        {isTyping && (
          <div className="flex items-end gap-2.5 chat-bubble-enter">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex-shrink-0 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
            </div>
          </div>
        )}

        {/* ── Choix TVA ── */}
        {showTvaChoice && !isTyping && (
          <div className="flex gap-2 ml-11 chat-bubble-enter flex-wrap">
            <button
              onClick={() => onTvaChoice(true)}
              className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-medium text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t("tva.yes", lang)}
            </button>
            <button
              onClick={() => onTvaChoice(false)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {t("tva.no", lang)}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Barre de saisie pill ── */}
      <div className="px-4 pb-4 pt-2 md:px-5">
        <div className="relative flex items-center bg-white border border-lavender-200 rounded-full px-4 py-2.5 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-500 flex-shrink-0 transition-colors mr-2"
            tabIndex={-1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t("chat.placeholder", lang)}
            className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 leading-relaxed pr-14"
          />
          <button
            onClick={() => onSend()}
            disabled={!input.trim() || isTyping}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-brand-600 hover:bg-brand-700 disabled:bg-lavender-300 disabled:cursor-not-allowed text-white rounded-full transition-colors shadow-lg active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          {t("chat.footer", lang)}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isWelcome = false }: { msg: ChatMessage; isWelcome?: boolean }) {
  const isUser = msg.role === "user";
  const time = format(new Date(msg.timestamp), "HH:mm");

  return (
    <div className={`flex items-end gap-2.5 chat-bubble-enter ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className={`${isWelcome ? "w-12 h-12 rounded-2xl" : "w-9 h-9 rounded-xl"} bg-brand-500 flex-shrink-0 flex items-center justify-center shadow-sm`}>
          <svg className={`${isWelcome ? "w-6 h-6" : "w-5 h-5"} text-white`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 ${isWelcome ? "py-4" : "py-3"} rounded-2xl ${isWelcome ? "text-[15px] leading-relaxed" : "text-sm leading-relaxed"} shadow-sm ${
            isUser
              ? "bg-brand-500 text-white rounded-br-sm"
              : "bg-white text-slate-800 rounded-bl-sm"
          }`}
        >
          {isUser ? msg.content : <FormattedMessage content={msg.content} />}
        </div>
        <span className="text-xs text-slate-400 px-1">{time}</span>
      </div>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const parts = content.split(/(AI-Artisan)/g);
  if (parts.length === 1) return <>{content}</>;
  return (
    <>
      {parts.map((part, i) =>
        part === "AI-Artisan" ? (
          <span key={i} className="text-brand-500 font-semibold">{part}</span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
