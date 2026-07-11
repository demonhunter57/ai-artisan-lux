"use client";

import { useEffect, useRef } from "react";
import { ChatMessage, Language } from "@/lib/types";
import { t } from "@/lib/i18n";
import { format } from "date-fns";

interface Props {
  messages: ChatMessage[];
  isTyping: boolean;
  input: string;
  lang: Language;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  onTvaChoice: (yes: boolean) => void;
}

export default function ChatInterface({
  messages, isTyping, input, lang,
  onInputChange, onSend, onNewChat, onTvaChoice,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

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
  const showTvaChoice =
    lastMsg?.role === "assistant" && lastMsg?.action === "ask_tva";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-700 text-sm">AI-Artisan</span>
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-lg px-3 py-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("chat.new", lang)}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} lang={lang} />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 chat-bubble-enter">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex-shrink-0 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
            </div>
          </div>
        )}

        {/* TVA choice buttons */}
        {showTvaChoice && !isTyping && (
          <div className="flex gap-2 ml-9 chat-bubble-enter">
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
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {t("tva.no", lang)}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t("chat.placeholder", lang)}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-700 placeholder-slate-400 max-h-32 leading-relaxed"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-1.5">
          Enter pour envoyer · Shift+Enter pour saut de ligne
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, lang }: { msg: ChatMessage; lang: Language }) {
  const isUser = msg.role === "user";
  const time = format(new Date(msg.timestamp), "HH:mm");

  return (
    <div className={`flex items-end gap-2 chat-bubble-enter ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-600 flex-shrink-0 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-brand-600 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-800 rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>
        <span className="text-xs text-slate-400 px-1">{time}</span>
      </div>
    </div>
  );
}
