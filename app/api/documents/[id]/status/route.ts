import { NextRequest, NextResponse } from "next/server";
import { getDocument, updateDocumentStatus } from "@/lib/db/documents";
import { StatusChangeSchema } from "@/lib/ai/schemas";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    const payloadValidation = StatusChangeSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid status change payload", {
        requestId,
        route: "/api/documents/[id]/status",
        id,
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!getDocument(id)) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    const document = updateDocumentStatus(id, payloadValidation.data.status);
    return NextResponse.json({ document }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Document status change error", err, { requestId, route: "/api/documents/[id]/status", id });
    return NextResponse.json(
      { error: "Erreur lors du changement de statut" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
