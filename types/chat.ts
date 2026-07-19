import type { Devis } from "./devis";

export type Language = "fr" | "en" | "lb";

export type ChatAction = "none" | "show_preview" | "ask_tva" | "confirm" | "generate_pdf";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  devis?: Partial<Devis>;
  action?: ChatAction;
  timestamp: string;
}

export interface ClaudeResponse {
  message: string;
  action: ChatAction;
  devis?: Partial<Devis>;
}
