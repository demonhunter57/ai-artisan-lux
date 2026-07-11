import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeResponse, Language, Devis } from "@/lib/types";
import { format } from "date-fns";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(language: Language, artisanProfile: Record<string, string>, today: string): string {
  const langInstructions: Record<Language, string> = {
    fr: "Réponds toujours en FRANÇAIS.",
    en: "Always reply in ENGLISH.",
    lb: "Äntwert ëmmer op LËTZEBUERGESCH (Luxembourgish). If uncertain about a word, use French.",
  };

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
  try {
    const { message, history, language, currentDevis, artisanProfile } = await req.json();
    const today = format(new Date(), "yyyy-MM-dd");
    const lang: Language = language ?? "fr";

    const systemPrompt = buildSystemPrompt(lang, artisanProfile, today);

    // Build conversation history for Claude
    const historyMessages = (history ?? []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed: ClaudeResponse;
    try {
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawText;
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return plain message
      parsed = {
        message: rawText,
        action: "none",
      };
    }

    // Validate and clean devis
    if (parsed.devis?.items) {
      parsed.devis.items = parsed.devis.items.map((item) => ({
        ...item,
        total: +(item.quantity * item.unitPrice).toFixed(2),
      }));
      const subtotal = parsed.devis.items.reduce((s, i) => s + i.total, 0);
      const tvaRate = parsed.devis.tvaRate ?? 17;
      parsed.devis.subtotal = +subtotal.toFixed(2);
      parsed.devis.tvaAmount = +(subtotal * tvaRate / 100).toFixed(2);
      parsed.devis.total = +(subtotal + parsed.devis.tvaAmount).toFixed(2);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { message: "Une erreur est survenue. Vérifiez votre clé API.", action: "none" },
      { status: 500 }
    );
  }
}
