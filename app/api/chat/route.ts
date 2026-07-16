import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse, Language } from "@/lib/types";
import { t } from "@/lib/i18n";
import priceCatalogData from "@/data/prestations-prix.json";
import { format } from "date-fns";
import { z } from "zod";
import { computeDevisTotals } from "@/lib/devis";
import { logError, logInfo } from "@/lib/logger";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const priceCatalog = priceCatalogData;

function normalizePromptProfile(profile: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, value ?? ""])
  );
}

function getUserFacingChatError(error: unknown, lang: Language): string {
  if (!(error instanceof Error)) {
    return t("api.chat.error.service", lang);
  }

  const message = error.message.toLowerCase();

  if (message.includes("credit balance is too low") || message.includes("billing")) {
    return t("api.chat.error.billing", lang);
  }

  if (message.includes("api key") || message.includes("authentication")) {
    return t("api.chat.error.auth", lang);
  }

  return t("api.chat.error.service", lang);
}

const ActionSchema = z.enum(["none", "show_preview", "ask_tva", "confirm", "generate_pdf"]);

const DevisItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number(),
  unit: z.string(),
  unitPrice: z.coerce.number(),
  total: z.coerce.number().optional(),
}).transform((item) => ({
  ...item,
  total: item.total ?? +(item.quantity * item.unitPrice).toFixed(2),
}));

const ClientSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tvaNumber: z.string().optional(),
});

const DevisSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  type: z.enum(["devis", "facture"]).optional(),
  date: z.string().optional(),
  validUntil: z.string().optional(),
  dueDate: z.string().optional(),
  client: ClientSchema.optional(),
  items: z.array(DevisItemSchema).optional(),
  tvaRate: z.coerce.number().optional(),
  subtotal: z.coerce.number().optional(),
  tvaAmount: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "validated", "paid", "overdue", "cancelled"]).optional(),
  isRenovationPrincipal: z.boolean().optional(),
});

const ClaudeResponseSchema = z.object({
  message: z.string().min(1),
  action: ActionSchema.default("none"),
  devis: DevisSchema.optional(),
});

const ChatPayloadSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  language: z.enum(["fr", "en", "lb"]).optional(),
  currentDevis: z.record(z.string(), z.unknown()).nullable().optional(),
  artisanProfile: z.record(z.string(), z.union([z.string(), z.null()])),
});

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

function buildSystemPrompt(language: Language, artisanProfile: Record<string, string>, today: string): string {
  const langInstructions: Record<Language, string> = {
    fr: "Réponds toujours en FRANÇAIS.",
    en: "Always reply in ENGLISH.",
    lb: "Äntwert ëmmer op LËTZEBUERGESCH (Luxembourgish). If uncertain about a word, use French.",
  };

  const catalogLines = priceCatalog.items
    .map((item) => `- ${item.reference}: ${item.description} | unité ${item.unit} | prix ${item.unitPrice} ${priceCatalog.currency}`)
    .join("\n");

  return `Tu es AI-Artisan, un assistant intelligent spécialisé dans la création de devis et de factures pour les artisans du bâtiment au Luxembourg.

${langInstructions[language]}

## PROFIL ARTISAN
- Entreprise: ${artisanProfile.company}
- Gérant: ${artisanProfile.manager}
- Adresse: ${artisanProfile.address}, ${artisanProfile.postal} ${artisanProfile.city}, ${artisanProfile.country}
- TVA: ${artisanProfile.tvaNumber}
- Matricule: ${artisanProfile.matricule}
- RCS: ${artisanProfile.rcs}
- Autorisation: ${artisanProfile.autorisation}

## DATE AUJOURD'HUI: ${today}

## TON RÔLE
1. Extraire les données de devis depuis le langage naturel (client, articles, quantités, prix unitaires)
2. Calculer les totaux HT, la TVA et le total TTC
3. Identifier le bon taux de TVA luxembourgeois et poser la question si nécessaire
4. Générer des devis et factures conformes au droit luxembourgeois

## TAUX DE TVA LUXEMBOURG
- 17% : Taux normal (travaux neufs, services standard)
- 14% : Taux intermédiaire (certains services)
- 8% : Taux réduit (certains produits)
- 3% : Taux super-réduit — UNIQUEMENT pour la rénovation de logements destinés à l'habitation PRINCIPALE du propriétaire

⚠️ RÈGLE CRITIQUE : Si l'utilisateur mentionne des travaux de rénovation, de réparation ou d'amélioration d'un bâtiment résidentiel, tu DOIS poser la question sur le taux 3%. Utilise action: "ask_tva".

## UNITÉS COURANTES
m², ml (mètre linéaire), m³, h (heure), j (jour), u (unité), forfait

## CATALOGUE TARIFAIRE ARTISAN
Utilise en priorité ces prestations et ces prix lorsqu'elles correspondent à la demande utilisateur.
Si une prestation du catalogue correspond clairement, reprends son descriptif et son prix unitaire exact.
${catalogLines}

## FORMAT DE RÉPONSE JSON OBLIGATOIRE
Réponds TOUJOURS en JSON valide avec cette structure exacte :

\`\`\`json
{
  "message": "ton message conversationnel ici",
  "action": "none" | "show_preview" | "ask_tva" | "confirm" | "generate_pdf",
  "devis": {
    "type": "devis" | "facture",
    "date": "YYYY-MM-DD",
    "validUntil": "YYYY-MM-DD",
    "client": {
      "name": "Nom du client",
      "address": "Rue et numéro",
      "city": "Ville",
      "postal": "L-XXXX",
      "email": "email@example.com",
      "phone": "+352 XX XX XX"
    },
    "items": [
      {
        "description": "Description de la prestation",
        "quantity": 10,
        "unit": "m²",
        "unitPrice": 45.00,
        "total": 450.00
      }
    ],
    "tvaRate": 17,
    "subtotal": 450.00,
    "tvaAmount": 76.50,
    "total": 526.50,
    "notes": "Remarques éventuelles",
    "status": "draft"
  }
}
\`\`\`

## RÈGLES D'ACTION
- "none" : message informatif, pas de devis encore
- "show_preview" : un devis a été créé ou mis à jour, afficher l'aperçu
- "ask_tva" : poser la question sur le taux 3% (travaux rénovation résidentielle détectés)
- "confirm" : confirmation d'une action (TVA choisie, article ajouté/supprimé)
- "generate_pdf" : l'utilisateur demande explicitement le PDF

## CALCUL TVA
- subtotal = somme de tous les items (quantity × unitPrice)
- tvaAmount = subtotal × tvaRate / 100
- total = subtotal + tvaAmount
- Arrondir à 2 décimales

## GÉNÉRATION DES NUMÉROS
- Devis : format D-YYYYMMDD-001
- Facture : format F-YYYYMMDD-001
- validUntil = date + 30 jours pour les devis

## IMPORTANT
- Ne pas inclure "devis" dans la réponse JSON si aucun devis n'est en cours
- Inclure uniquement les champs client renseignés
- Être conversationnel et professionnel
- Si l'utilisateur fournit des infos partielles, créer un devis avec ces infos et demander le reste`;
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
