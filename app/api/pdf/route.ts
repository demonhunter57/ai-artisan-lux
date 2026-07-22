import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfDocument } from "@/components/devis/PdfDocument";
import { Devis, Language } from "@/types";
import { t } from "@/i18n";
import React from "react";
import { format } from "date-fns";
import { computeDevisTotals } from "@/lib/devis";
import { logError, logInfo } from "@/lib/logger";
import { PdfPayloadSchema } from "@/lib/ai/schemas";
import { DEFAULT_TVA_RATE } from "@/constants/tva";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  let lang: Language = "fr";

  try {
    const payloadValidation = PdfPayloadSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid PDF payload", {
        requestId,
        route: "/api/pdf",
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: t("api.pdf.error.invalidPayload", lang) },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const { devis, artisanProfile, language } = payloadValidation.data;
    lang = language ?? "fr";

    const normalizedDevis = computeDevisTotals({
      ...devis,
      tvaRate: devis.tvaRate ?? DEFAULT_TVA_RATE,
    });

    // Build complete Devis object with defaults
    const fullDevis: Devis = {
      type: devis.type ?? "devis",
      date: devis.date ?? format(new Date(), "yyyy-MM-dd"),
      validUntil: devis.validUntil ?? format(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      ),
      dueDate: devis.dueDate,
      number: devis.number ?? `${devis.type === "facture" ? "F" : "D"}-${format(new Date(), "yyyyMMdd-HHmm")}`,
      client: devis.client,
      items: normalizedDevis.items ?? [],
      tvaRate: normalizedDevis.tvaRate ?? DEFAULT_TVA_RATE,
      subtotal: normalizedDevis.subtotal ?? 0,
      tvaAmount: normalizedDevis.tvaAmount ?? 0,
      total: normalizedDevis.total ?? 0,
      notes: devis.notes,
      status: devis.status ?? "draft",
      isRenovationPrincipal: devis.isRenovationPrincipal ?? false,
      language: language,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(PdfDocument, {
        devis: fullDevis,
        artisan: artisanProfile,
        language: language ?? "fr",
      })
    );

    const docType = fullDevis.type === "facture" ? t("pdf.facture", lang) : t("pdf.devis", lang);
    const filename = `${docType}_${fullDevis.number}.pdf`;
    const pdfBytes = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBytes.byteLength.toString(),
        "x-request-id": requestId,
      },
    });
  } catch (err) {
    logError("PDF generation error", err, { requestId, route: "/api/pdf" });
    return NextResponse.json(
      { error: t("api.pdf.error.generation", lang) },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
