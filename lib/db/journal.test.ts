import { describe, expect, it, beforeEach } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createTestDb } from "./testDb";
import { getAccountBalances, insertJournalEntry, JournalImbalanceError, listJournalEntries } from "./journal";
import { ACCOUNT_BANK, ACCOUNT_CLIENTS, ACCOUNT_SALES, ACCOUNT_VAT_COLLECTED } from "@/constants/accounts";

describe("journal", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
  });

  it("rejette une ecriture desequilibree", () => {
    expect(() =>
      insertJournalEntry(
        {
          date: "2026-01-01",
          label: "Test",
          eventType: "invoice_issued",
          lines: [
            { accountCode: ACCOUNT_CLIENTS, debit: 100 },
            { accountCode: ACCOUNT_SALES, credit: 90 },
          ],
        },
        db
      )
    ).toThrow(JournalImbalanceError);
  });

  it("insere une ecriture equilibree et la relit correctement", () => {
    const entryId = insertJournalEntry(
      {
        date: "2026-01-01",
        label: "Facture F-1 emise",
        eventType: "invoice_issued",
        lines: [
          { accountCode: ACCOUNT_CLIENTS, debit: 117 },
          { accountCode: ACCOUNT_SALES, credit: 100 },
          { accountCode: ACCOUNT_VAT_COLLECTED, credit: 17 },
        ],
      },
      db
    );

    const entries = listJournalEntries({}, db);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entryId);
    expect(entries[0].lines).toHaveLength(3);
    expect(entries[0].lines.find((l) => l.accountCode === ACCOUNT_CLIENTS)?.debit).toBe(117);
  });

  it("agrege les soldes par compte sur plusieurs ecritures", () => {
    insertJournalEntry(
      {
        date: "2026-01-01",
        label: "Facture F-1 emise",
        eventType: "invoice_issued",
        lines: [
          { accountCode: ACCOUNT_CLIENTS, debit: 117 },
          { accountCode: ACCOUNT_SALES, credit: 100 },
          { accountCode: ACCOUNT_VAT_COLLECTED, credit: 17 },
        ],
      },
      db
    );
    insertJournalEntry(
      {
        date: "2026-01-05",
        label: "Facture F-1 payee",
        eventType: "invoice_paid",
        lines: [
          { accountCode: ACCOUNT_BANK, debit: 117 },
          { accountCode: ACCOUNT_CLIENTS, credit: 117 },
        ],
      },
      db
    );

    const balances = getAccountBalances(db);
    const clients = balances.find((b) => b.code === ACCOUNT_CLIENTS)!;
    expect(clients.debitTotal).toBe(117);
    expect(clients.creditTotal).toBe(117);
    expect(clients.balance).toBe(0);

    const bank = balances.find((b) => b.code === ACCOUNT_BANK)!;
    expect(bank.balance).toBe(117);
  });
});
