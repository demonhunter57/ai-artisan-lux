export interface ArtisanProfile {
  company: string;
  manager: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  tvaNumber: string;
  matricule: string;
  rcs: string;
  autorisation: string;
  iban?: string;
  bic?: string;
  logoUrl?: string | null;
}

export interface Client {
  name: string;
  address?: string;
  city?: string;
  postal?: string;
  country?: string;
  phone?: string;
  email?: string;
  tvaNumber?: string;
}

export interface DevisItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PriceCatalogItem {
  reference: string;
  description: string;
  unit: string;
  unitPrice: number;
}

export interface PriceCatalog {
  currency: string;
  updatedAt: string;
  items: PriceCatalogItem[];
}

export interface Devis {
  id?: string;
  number?: string;
  type: "devis" | "facture";
  date: string;
  validUntil?: string;
  dueDate?: string;
  client: Client;
  items: DevisItem[];
  tvaRate: number;
  subtotal: number;
  tvaAmount: number;
  total: number;
  notes?: string;
  signatureDataUrl?: string;
  signerName?: string;
  signedAt?: string;
  status: "draft" | "sent" | "validated" | "paid" | "overdue" | "cancelled";
  isRenovationPrincipal?: boolean;
  language?: Language;
}

export type Language = "fr" | "en" | "lb";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  devis?: Partial<Devis>;
  action?: "none" | "show_preview" | "ask_tva" | "confirm" | "generate_pdf";
  timestamp: string;
}

export interface ClaudeResponse {
  message: string;
  action: "none" | "show_preview" | "ask_tva" | "confirm" | "generate_pdf";
  devis?: Partial<Devis>;
}

export type TVARate = 3 | 8 | 14 | 17;

export const TVA_RATES: { value: TVARate; label: string; description: string }[] = [
  { value: 3,  label: "3%",  description: "Super-réduit — Rénovation logement principal" },
  { value: 8,  label: "8%",  description: "Réduit — Travaux spécifiques" },
  { value: 14, label: "14%", description: "Intermédiaire" },
  { value: 17, label: "17%", description: "Normal — Taux standard" },
];
