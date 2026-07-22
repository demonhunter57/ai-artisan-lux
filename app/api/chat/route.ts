import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse, Language } from "@/types";
import { t } from "@/i18n";
import { format } from "date-fns";
import { computeDevisTotals } from "@/lib/devis";
import { logError, logInfo } from "@/lib/logger";
import { buildSystemPrompt, normalizePromptProfile } from "@/lib/ai/prompt";
import { ChatPayloadSchema, ClaudeResponseSchema } from "@/lib/ai/schemas";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getUserFacingChatError(error: unknown, lang: Language): string {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return t("api.chat.error.auth", lang);
  }

  if (error instanceof Anthropic.APIError) {
    const message = error.message.toLowerCase();
    if (message.includes("credit balance is too low") || message.includes("billing")) {
      return t("api.chat.error.billing", lang);
    }
  }

  return t("api.chat.error.service", lang);
}

function extractJsonText(rawText: string): string {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1];
  }

  const objectMatch = rawText.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return objectMatch[0];
  }

  return rawText;
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  let requestLang: Language = "fr";

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      logError("Anthropic API key missing", new Error("Missing ANTHROPIC_API_KEY"), {
        requestId,
        route: "/api/chat",
      });
      return NextResponse.json(
        { message: t("api.chat.error.missingKey", requestLang), action: "none" },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }

    const clientKey = getClientKey(req);
    if (!checkRateLimit(`chat:${clientKey}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
      logInfo("Chat rate limit exceeded", { requestId, route: "/api/chat", clientKey });
      return NextResponse.json(
        { message: t("api.chat.error.rateLimit", requestLang), action: "none" },
        { status: 429, headers: { "x-request-id": requestId } }
      );
    }

    const payloadValidation = ChatPayloadSchema.safeParse(await req.json());
    if (!payloadValidation.success) {
      logInfo("Invalid chat payload", {
        requestId,
        route: "/api/chat",
        issues: payloadValidation.error.issues,
      });
      return NextResponse.json(
        { message: t("api.chat.error.invalidMessage", requestLang), action: "none" },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const { message, history, language, currentDevis, artisanProfile } = payloadValidation.data;
    requestLang = language ?? "fr";

    const today = format(new Date(), "yyyy-MM-dd");
    const lang: Language = language ?? "fr";

    const systemPrompt = buildSystemPrompt(lang, normalizePromptProfile(artisanProfile), today);

    // Build conversation history for Claude
    const historyMessages = (history ?? [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Add context about current devis if exists
    let userContent = message;
    if (currentDevis && Object.keys(currentDevis).length > 0) {
      userContent = `[Contexte - Devis en cours: ${JSON.stringify(currentDevis, null, 2)}]\n\n${message}`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: userContent },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed: ClaudeResponse;
    try {
      const jsonStr = extractJsonText(rawText);
      const parsedCandidate = JSON.parse(jsonStr);
      const validation = ClaudeResponseSchema.safeParse(parsedCandidate);

      if (!validation.success) {
        parsed = { message: rawText || t("api.chat.error.parse", requestLang), action: "none" };
      } else {
        parsed = validation.data;
      }
    } catch {
      logInfo("Chat response JSON parsing failed", {
        requestId,
        route: "/api/chat",
      });
      // If parsing fails, return plain message
      parsed = {
        message: rawText || t("api.chat.error.parse", requestLang),
        action: "none",
      };
    }

    // Validate and clean devis
    if (parsed.devis) {
      const normalizedDevis = computeDevisTotals({
        ...parsed.devis,
        date: parsed.devis.date ?? today,
        status: parsed.devis.status ?? "draft",
      });
      parsed.devis = normalizedDevis;
    }

    return NextResponse.json(parsed, { headers: { "x-request-id": requestId } });
  } catch (err) {
    logError("Chat API error", err, { requestId, route: "/api/chat" });
    return NextResponse.json(
      { message: getUserFacingChatError(err, requestLang), action: "none" },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
