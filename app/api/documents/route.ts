import { NextRequest, NextResponse } from "next/server";
import { createDocument, listDocuments } from "@/lib/db/documents";
import { DocumentRecordSchema } from "@/lib/ai/schemas";
import { logError, logInfo } from "@/lib/logger";
import type { Devis } from "@/types";

const DOCUMENT_STATUSES: Devis["status"][] = ["draft", "sent", "validated", "paid", "overdue", "cancelled"];

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const result = listDocuments({
      type: type === "devis" || type === "facture" ? type : undefined,
      status: DOCUMENT_STATUSES.find((s) => s === status),
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return NextResponse.json(result, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Document list error", err, { requestId, route: "/api/documents" });
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des documents" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const payloadValidation = DocumentRecordSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid document payload", {
        requestId,
        route: "/api/documents",
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: "Payload invalide", issues: payloadValidation.error.issues },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const document = createDocument(payloadValidation.data);
    return NextResponse.json({ document }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Document creation error", err, { requestId, route: "/api/documents" });
    return NextResponse.json(
      { error: "Erreur lors de la creation du document" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
