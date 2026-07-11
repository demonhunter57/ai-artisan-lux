import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfDocument } from "@/components/PdfDocument";
import { Devis, ArtisanProfile, Language } from "@/lib/types";
import React from "react";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { devis, artisanProfile, language } = await req.json() as {
      devis: Partial<Devis>;
      artisanProfile: ArtisanProfile;
      language: Language;
    };

    // Validate required fields
    if (!devis.client?.name || !devis.items?.length) {
      return NextResponse.json(
        { error: "Client et articles requis pour générer le PDF" },
        { status: 400 }
      );
    }

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
      items: devis.items,
      tvaRate: devis.tvaRate ?? 17,
      subtotal: devis.subtotal ?? devis.items.reduce((s, i) => s + i.total, 0),
      tvaAmount: devis.tvaAmount ?? 0,
      total: devis.total ?? 0,
      notes: devis.notes,
      status: devis.status ?? "draft",
      isRenovationPrincipal: devis.isRenovationPrincipal ?? false,
      language: language,
    };

    // Recalculate if needed
    if (!devis.tvaAmount) {
      fullDevis.tvaAmount = +(fullDevis.subtotal * fullDevis.tvaRate / 100).toFixed(2);
      fullDevis.total = +(fullDevis.subtotal + fullDevis.tvaAmount).toFixed(2);
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(PdfDocument, {
        devis: fullDevis,
        artisan: artisanProfile,
        language: language ?? "fr",
      })
    );

    const docType = fullDevis.type === "facture" ? "Facture" : "Devis";
    const filename = `${docType}_${fullDevis.number}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
