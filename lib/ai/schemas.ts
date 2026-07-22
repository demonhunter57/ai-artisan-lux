import { z } from "zod";

export const ActionSchema = z.enum(["none", "show_preview", "ask_tva", "confirm", "generate_pdf"]);

export const DevisItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number(),
  unit: z.string(),
  unitPrice: z.coerce.number(),
  total: z.coerce.number().optional(),
}).transform((item) => ({
  ...item,
  total: item.total ?? +(item.quantity * item.unitPrice).toFixed(2),
}));

export const ClientSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tvaNumber: z.string().optional(),
});

export const DevisSchema = z.object({
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

export const ClaudeResponseSchema = z.object({
  message: z.string().min(1),
  action: ActionSchema.default("none"),
  devis: DevisSchema.optional(),
});

export const ChatPayloadSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  language: z.enum(["fr", "en", "lb"]).optional(),
  currentDevis: z.record(z.string(), z.unknown()).nullable().optional(),
  artisanProfile: z.record(z.string(), z.union([z.string(), z.null()])),
});

export const ArtisanProfileSchema = z.object({
  company: z.string().min(1),
  manager: z.string(),
  address: z.string(),
  city: z.string(),
  postal: z.string(),
  country: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string().optional(),
  tvaNumber: z.string(),
  matricule: z.string(),
  rcs: z.string(),
  autorisation: z.string(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
});

export const PdfPayloadSchema = z.object({
  devis: DevisSchema.extend({
    client: ClientSchema,
    items: z.array(DevisItemSchema).min(1),
  }),
  artisanProfile: ArtisanProfileSchema,
  language: z.enum(["fr", "en", "lb"]).optional(),
});
