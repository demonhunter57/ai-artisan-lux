-- documents: un devis OU une facture. Champs client denormalises (pas de table clients separee).
CREATE TABLE IF NOT EXISTS documents (
  id                       TEXT PRIMARY KEY,
  number                   TEXT NOT NULL,
  type                     TEXT NOT NULL CHECK (type IN ('devis','facture')),
  status                   TEXT NOT NULL CHECK (status IN ('draft','sent','validated','paid','overdue','cancelled')),
  date                     TEXT NOT NULL,
  valid_until              TEXT,
  due_date                 TEXT,
  client_name              TEXT NOT NULL,
  client_address           TEXT,
  client_city              TEXT,
  client_postal            TEXT,
  client_country            TEXT,
  client_phone             TEXT,
  client_email             TEXT,
  client_tva_number        TEXT,
  tva_rate                 REAL NOT NULL,
  subtotal                 REAL NOT NULL,
  tva_amount                REAL NOT NULL,
  total                    REAL NOT NULL,
  notes                    TEXT,
  signature_data_url       TEXT,
  signer_name               TEXT,
  signed_at                TEXT,
  is_renovation_principal  INTEGER NOT NULL DEFAULT 0,
  language                 TEXT,
  source_devis_id          TEXT REFERENCES documents(id) ON DELETE SET NULL,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type, status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_number ON documents(number);

-- document_items: lignes d'articles, ordonnees par position
CREATE TABLE IF NOT EXISTS document_items (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  description   TEXT NOT NULL,
  quantity      REAL NOT NULL,
  unit          TEXT NOT NULL,
  unit_price    REAL NOT NULL,
  total         REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);

-- accounts: plan comptable minimal, illustratif (non certifie, voir avertissement UI)
CREATE TABLE IF NOT EXISTS accounts (
  code    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL CHECK (type IN ('asset','liability','revenue','expense'))
);

INSERT OR IGNORE INTO accounts (code, name, type) VALUES
  ('411000', 'Clients (creances)', 'asset'),
  ('512000', 'Banque', 'asset'),
  ('706000', 'Prestations de services', 'revenue'),
  ('4457000', 'TVA collectee', 'liability');

-- journal_entries: un evenement comptable (facture emise, payee, extournee...)
CREATE TABLE IF NOT EXISTS journal_entries (
  id            TEXT PRIMARY KEY,
  date          TEXT NOT NULL,
  label         TEXT NOT NULL,
  document_id   TEXT REFERENCES documents(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('invoice_issued','invoice_paid','invoice_reversed')),
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_document_id ON journal_entries(document_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);

-- journal_lines: lignes debit/credit. L'equilibre par ecriture (sum(debit) = sum(credit))
-- n'est pas verifiable par un CHECK cross-row en SQLite -> applique en code (lib/db/journal.ts).
CREATE TABLE IF NOT EXISTS journal_lines (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code  TEXT NOT NULL REFERENCES accounts(code),
  debit         REAL NOT NULL DEFAULT 0,
  credit        REAL NOT NULL DEFAULT 0,
  CHECK ((debit >= 0 AND credit >= 0) AND NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON journal_lines(account_code);

-- catalog_items: bibliotheque d'articles/prestations reutilisables (chat IA + formulaire manuel).
-- Seedee depuis data/prestations-prix.json au premier demarrage si la table est vide (lib/db/catalog.ts).
CREATE TABLE IF NOT EXISTS catalog_items (
  id           TEXT PRIMARY KEY,
  reference    TEXT NOT NULL,
  description  TEXT NOT NULL,
  unit         TEXT NOT NULL,
  unit_price   REAL NOT NULL,
  tva_rate     REAL NOT NULL DEFAULT 17,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_items_reference ON catalog_items(reference);
