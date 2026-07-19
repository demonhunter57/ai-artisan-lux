import type { Language } from "./chat";

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

export type TVARate = 3 | 8 | 14 | 17;
