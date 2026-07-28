import { NextRequest, NextResponse } from "next/server";
import { convertDevisToFacture, getDocument } from "@/lib/db/documents";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    const source = getDocument(id);
    if (!source) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }
    if (source.type !== "devis") {
      return NextResponse.json(
        { error: "Seul un devis peut etre converti en facture" },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const document = convertDevisToFacture(id);
    return NextResponse.json({ document }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Devis to facture conversion error", err, { requestId, route: "/api/documents/[id]/convert-to-facture", id });
    return NextResponse.json(
      { error: "Erreur lors de la conversion en facture" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
