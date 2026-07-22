import { describe, expect, it } from "vitest";
import { ChatPayloadSchema, PdfPayloadSchema } from "./schemas";

describe("ChatPayloadSchema", () => {
  it("accepte un payload minimal valide", () => {
    const result = ChatPayloadSchema.safeParse({
      message: "Bonjour",
      artisanProfile: { company: "Weber Constructions" },
    });
    expect(result.success).toBe(true);
  });

  it("rejette un message vide", () => {
    const result = ChatPayloadSchema.safeParse({
      message: "",
      artisanProfile: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejette un payload sans artisanProfile", () => {
    const result = ChatPayloadSchema.safeParse({ message: "Bonjour" });
    expect(result.success).toBe(false);
  });
});

describe("PdfPayloadSchema", () => {
  const validArtisanProfile = {
    company: "Weber Constructions",
    manager: "Jean Weber",
    address: "1 Rue du Test",
    city: "Luxembourg",
    postal: "L-1111",
    country: "Luxembourg",
    phone: "+352 00 00 00",
    email: "contact@weber.lu",
    tvaNumber: "LU12345678",
    matricule: "12345678901",
    rcs: "B123456",
    autorisation: "00000000",
  };

  it("accepte un devis avec client et items", () => {
    const result = PdfPayloadSchema.safeParse({
      devis: {
        client: { name: "Client Test" },
        items: [{ description: "Peinture", quantity: 1, unit: "u", unitPrice: 100 }],
      },
      artisanProfile: validArtisanProfile,
    });
    expect(result.success).toBe(true);
  });

  it("rejette un devis sans items", () => {
    const result = PdfPayloadSchema.safeParse({
      devis: { client: { name: "Client Test" }, items: [] },
      artisanProfile: validArtisanProfile,
    });
    expect(result.success).toBe(false);
  });

  it("rejette un devis sans client", () => {
    const result = PdfPayloadSchema.safeParse({
      devis: { items: [{ description: "Peinture", quantity: 1, unit: "u", unitPrice: 100 }] },
      artisanProfile: validArtisanProfile,
    });
    expect(result.success).toBe(false);
  });

  it("rejette un profil artisan incomplet", () => {
    const result = PdfPayloadSchema.safeParse({
      devis: {
        client: { name: "Client Test" },
        items: [{ description: "Peinture", quantity: 1, unit: "u", unitPrice: 100 }],
      },
      artisanProfile: { company: "Weber Constructions" },
    });
    expect(result.success).toBe(false);
  });
});
