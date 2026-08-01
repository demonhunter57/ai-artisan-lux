import { NextRequest, NextResponse } from "next/server";
import { deleteCatalogItem, getCatalogItem, updateCatalogItem } from "@/lib/db/catalog";
import { CatalogItemUpdateSchema } from "@/lib/ai/schemas";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    const payloadValidation = CatalogItemUpdateSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid catalog item update payload", {
        requestId,
        route: "/api/catalog/[id]",
        id,
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: "Payload invalide", issues: payloadValidation.error.issues },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    if (!getCatalogItem(id)) {
      return NextResponse.json(
        { error: "Article introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    const item = updateCatalogItem(id, payloadValidation.data);
    return NextResponse.json({ item }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Catalog item update error", err, { requestId, route: "/api/catalog/[id]", id });
    return NextResponse.json(
      { error: "Erreur lors de la modification de l'article" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { id } = await params;

  try {
    if (!getCatalogItem(id)) {
      return NextResponse.json(
        { error: "Article introuvable" },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    deleteCatalogItem(id);
    return NextResponse.json({ ok: true }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Catalog item delete error", err, { requestId, route: "/api/catalog/[id]", id });
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'article" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
