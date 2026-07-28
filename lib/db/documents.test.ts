import { describe, expect, it, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createTestDb } from "./testDb";
import {
  convertDevisToFacture,
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  updateDocumentStatus,
  type DocumentCreateInput,
} from "./documents";
import { getAccountBalances, listJournalEntries } from "./journal";

function baseFacture(overrides: Partial<DocumentCreateInput> = {}): DocumentCreateInput {
  return {
    type: "facture",
    date: "2026-01-01",
    client: { name: "Client Test" },
    items: [{ description: "Peinture", quantity: 10, unit: "m2", unitPrice: 12, total: 999 }],
    ...overrides,
  } as DocumentCreateInput;
}

describe("documents", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
  });

  it("recalcule les totaux plutot que de faire confiance au client", () => {
    const created = createDocument(baseFacture(), db);
    // 10 * 12 = 120 HT, pas 999 comme envoye par le "client"
    expect(created.items[0].total).toBe(120);
    expect(created.subtotal).toBe(120);
  });

  it("remplace correctement les lignes lors d'une modification", () => {
    const created = createDocument(baseFacture(), db);
    const updated = updateDocument(
      created.id!,
      { items: [{ description: "Carrelage", quantity: 2, unit: "u", unitPrice: 50, total: 0 }] },
      db
    );
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].description).toBe("Carrelage");
    expect(updated.subtotal).toBe(100);
  });

  it("un devis ne genere jamais d'ecriture comptable, quels que soient les changements de statut", () => {
    const devis = createDocument(baseFacture({ type: "devis", status: "sent" }), db);
    updateDocumentStatus(devis.id!, "validated", db);
    updateDocumentStatus(devis.id!, "cancelled", db);

    expect(listJournalEntries({}, db)).toHaveLength(0);
  });

  it("scenario complet facture: emission -> paiement -> annulation (extourne)", () => {
    const facture = createDocument(baseFacture({ status: "draft" }), db);
    expect(listJournalEntries({}, db)).toHaveLength(0); // brouillon: pas encore d'ecriture

    const sent = updateDocumentStatus(facture.id!, "sent", db);
    const afterIssue = listJournalEntries({}, db);
    expect(afterIssue).toHaveLength(1);
    expect(afterIssue[0].eventType).toBe("invoice_issued");
    const issueLines = afterIssue[0].lines;
    expect(issueLines.reduce((s, l) => s + l.debit, 0)).toBe(sent.total);
    expect(issueLines.reduce((s, l) => s + l.credit, 0)).toBe(sent.total);

    // re-sauvegarder sans changer le statut ne doit pas dupliquer l'ecriture d'emission
    updateDocument(facture.id!, { notes: "note" }, db);
    expect(listJournalEntries({}, db)).toHaveLength(1);

    const paid = updateDocumentStatus(facture.id!, "paid", db);
    const afterPaid = listJournalEntries({}, db);
    expect(afterPaid).toHaveLength(2);
    expect(afterPaid.some((e) => e.eventType === "invoice_paid")).toBe(true);

    // idempotence: re-marquer payee ne doit pas dupliquer
    updateDocumentStatus(facture.id!, "paid", db);
    expect(listJournalEntries({}, db)).toHaveLength(2);

    updateDocumentStatus(facture.id!, "cancelled", db);
    const afterCancel = listJournalEntries({}, db);
    expect(afterCancel).toHaveLength(3);
    // La facture etait a la fois emise et payee : l'extourne combine les deux contre-passations
    // (2x le montant total), mais reste equilibree debit = credit.
    const reversal = afterCancel.find((e) => e.eventType === "invoice_reversed")!;
    const reversalDebit = reversal.lines.reduce((s, l) => s + l.debit, 0);
    const reversalCredit = reversal.lines.reduce((s, l) => s + l.credit, 0);
    expect(reversalDebit).toBeCloseTo(reversalCredit, 2);
    expect(reversalDebit).toBeCloseTo(2 * paid.total, 2);

    // Les soldes de tous les comptes lies a cette facture reviennent a zero apres l'extourne.
    const finalBalances = getAccountBalances(db);
    for (const balance of finalBalances) {
      expect(balance.balance).toBe(0);
    }
  });

  it("convertDevisToFacture cree un nouveau document et laisse le devis original inchange", () => {
    const devis = createDocument(baseFacture({ type: "devis", status: "sent" }), db);
    const facture = convertDevisToFacture(devis.id!, db);

    expect(facture.id).not.toBe(devis.id);
    expect(facture.type).toBe("facture");
    expect(facture.status).toBe("draft");
    expect(facture.total).toBe(devis.total);

    const stillDevis = getDocument(devis.id!, db);
    expect(stillDevis?.type).toBe("devis");
    expect(stillDevis?.status).toBe("sent");
  });

  it("liste les documents avec filtre par type", () => {
    createDocument(baseFacture({ type: "devis" }), db);
    createDocument(baseFacture({ type: "facture" }), db);

    const { documents, total } = listDocuments({ type: "facture" }, db);
    expect(total).toBe(1);
    expect(documents[0].type).toBe("facture");
  });
});
