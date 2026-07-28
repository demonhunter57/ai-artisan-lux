import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances, listJournalEntries } from "@/lib/db/journal";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const { searchParams } = new URL(req.url);
    const accountCode = searchParams.get("accountCode") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const entries = listJournalEntries({ accountCode, from, to });
    const accountBalances = getAccountBalances();

    return NextResponse.json({ entries, accountBalances }, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Journal fetch error", err, { requestId, route: "/api/journal" });
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du journal" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
