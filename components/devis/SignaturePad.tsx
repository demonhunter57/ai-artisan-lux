"use client";

import { useEffect, useRef, useState } from "react";
import { Language } from "@/types";
import { t } from "@/i18n";

interface Props {
  lang: Language;
  signatureDataUrl?: string;
  initialSignerName?: string;
  onSave: (signatureDataUrl: string, signerName: string) => void;
}

export default function SignaturePad({ lang, signatureDataUrl, initialSignerName, onSave }: Props) {
  const [signerName, setSignerName] = useState(initialSignerName ?? "");
  const [signatureMessage, setSignatureMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(Boolean(signatureDataUrl));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";

    if (signatureDataUrl) {
      const img = new window.Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = signatureDataUrl;
      hasDrawnRef.current = true;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
    // Ce composant est remonte a chaque affichage (parent conditionnel) : pas besoin d'autre dependance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const position = pointerPosition(event);
    if (!canvas || !position) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    hasDrawnRef.current = true;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const position = pointerPosition(event);
    if (!canvas || !position || !drawingRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawnRef.current = false;
    setSignatureMessage("");
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) {
      setSignatureMessage(t("devis.signatureMissing", lang));
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, signerName.trim());
    setSignatureMessage(t("devis.signatureSaved", lang));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{t("devis.signatureTitle", lang)}</p>
        <p className="text-xs text-slate-400 mt-1">{t("devis.signatureSubtitle", lang)}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">{t("devis.signerName", lang)}</label>
        <input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder={t("devis.signaturePlaceholder", lang)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
        />
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        className="h-40 w-full rounded-xl border border-dashed border-slate-300 bg-white touch-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={clearSignature}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("devis.clearSignature", lang)}
        </button>
        <button
          onClick={saveSignature}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t("devis.saveSignature", lang)}
        </button>
      </div>

      {signatureMessage && (
        <p className="text-xs text-slate-500">{signatureMessage}</p>
      )}
    </div>
  );
}
