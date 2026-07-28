import { NextRequest, NextResponse } from "next/server";
import { getDocument, updateDocument } from "@/lib/db/documents";
import { DocumentUpdateSchema } from "@/lib/ai/schemas";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    const document = getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }
    return NextResponse.json({ document }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Document fetch error", err, { requestId, route: "/api/documents/[id]", id });
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du document" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    const payloadValidation = DocumentUpdateSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid document update payload", {
        requestId,
        route: "/api/documents/[id]",
        id,
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: "Payload invalide", issues: payloadValidation.error.issues },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!getDocument(id)) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    const document = updateDocument(id, payloadValidation.data);
    return NextResponse.json({ document }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Document update error", err, { requestId, route: "/api/documents/[id]", id });
    return NextResponse.json(
      { error: "Erreur lors de la modification du document" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
