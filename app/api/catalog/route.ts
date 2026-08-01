import { NextRequest, NextResponse } from "next/server";
import { createCatalogItem, listCatalogItems } from "@/lib/db/catalog";
import { CatalogItemSchema } from "@/lib/ai/schemas";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const items = listCatalogItems();
    return NextResponse.json({ items }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Catalog list error", err, { requestId, route: "/api/catalog" });
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la bibliotheque" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const payloadValidation = CatalogItemSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid catalog item payload", {
        requestId,
        route: "/api/catalog",
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { error: "Payload invalide", issues: payloadValidation.error.issues },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const item = createCatalogItem(payloadValidation.data);
    return NextResponse.json({ item }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Catalog item creation error", err, { requestId, route: "/api/catalog" });
    return NextResponse.json(
      { error: "Erreur lors de la creation de l'article" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
