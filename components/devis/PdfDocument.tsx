import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import { ArtisanProfile, Devis, Language } from "@/types";
import { t } from "@/i18n";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// Use built-in fonts (no external font needed)
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    padding: "40px 45px",
    backgroundColor: "#ffffff",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#1a74ff",
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 8.5,
    color: "#64748b",
    marginBottom: 2,
  },
  docTypeBlock: {
    alignItems: "flex-end",
  },
  docType: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0052f5",
    letterSpacing: 2,
  },
  docNumber: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  docDate: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 20,
  },
  thickDivider: {
    borderBottomWidth: 3,
    borderBottomColor: "#1a74ff",
    marginBottom: 20,
  },
  // Addresses row
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  addressBlock: {
    width: "45%",
  },
  addressLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  addressName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 1.5,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a74ff",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 40, textAlign: "right" },
  colUnitPrice: { width: 65, textAlign: "right" },
  colTotal: { width: 65, textAlign: "right" },
  cellText: {
    fontSize: 9,
    color: "#334155",
  },
  cellUnit: {
    fontSize: 8,
    color: "#94a3b8",
  },
  // Totals
  totalsBlock: {
    alignSelf: "flex-end",
    width: "40%",
    marginTop: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  totalLabel: {
    fontSize: 9,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 9,
    color: "#334155",
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    backgroundColor: "#1a74ff",
    borderRadius: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#ffffff",
  },
  totalFinalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#ffffff",
  },
  // TVA badge
  tvaBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 3,
    padding: "3px 6px",
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tvaBadgeText: {
    fontSize: 8,
    color: "#16a34a",
  },
  // Notes
  notesBlock: {
    marginTop: 20,
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    padding: "8px 12px",
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: "#78350f",
  },
  signatureBlock: {
    marginTop: 20,
    width: 180,
  },
  signatureTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  signatureBox: {
    height: 70,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 6,
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  signatureImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  signatureMeta: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 4,
  },
  // Payment & Legal
  footer: {
    position: "absolute",
    bottom: 40,
    left: 45,
    right: 45,
  },
  paymentBlock: {
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: "10px 14px",
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  paymentLabel: {
    fontSize: 8,
    color: "#94a3b8",
    width: 60,
  },
  paymentValue: {
    fontSize: 8,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
  },
  legalBlock: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  legalTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  legalText: {
    fontSize: 7,
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  legalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  legalItem: {
    fontSize: 7,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    padding: "2px 5px",
  },
});

function fmt(n: number): string {
  return n.toLocaleString("fr-LU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

interface Props {
  devis: Devis;
  artisan: ArtisanProfile;
  language: Language;
}

export function PdfDocument({ devis, artisan, language }: Props) {
  const dateLocale = language === "en" ? enUS : fr;
  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd MMMM yyyy", { locale: dateLocale }) : "";

  const docTitle = devis.type === "facture"
    ? t("pdf.facture", language)
    : t("pdf.devis", language);

  const docNumber = devis.number ?? `${devis.type === "facture" ? "F" : "D"}-${format(new Date(), "yyyyMMdd-HHmm")}`;

  return (
    <Document
      title={`${docTitle} ${docNumber}`}
      author={artisan.company}
      creator="AI-Artisan Lux"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{artisan.company}</Text>
            <Text style={styles.companyDetail}>{artisan.address}</Text>
            <Text style={styles.companyDetail}>{artisan.postal} {artisan.city}, {artisan.country}</Text>
            <Text style={styles.companyDetail}>{artisan.phone}</Text>
            <Text style={styles.companyDetail}>{artisan.email}</Text>
            {artisan.website && <Text style={styles.companyDetail}>{artisan.website}</Text>}
          </View>
          <View style={styles.docTypeBlock}>
            <Text style={styles.docType}>{docTitle}</Text>
            <Text style={styles.docNumber}>N° {docNumber}</Text>
            <Text style={styles.docDate}>{formatDate(devis.date)}</Text>
            {devis.type === "devis" && devis.validUntil && (
              <Text style={styles.docDate}>
                {t("devis.validUntil", language)}: {formatDate(devis.validUntil)}
              </Text>
            )}
            {devis.type === "facture" && devis.dueDate && (
              <Text style={styles.docDate}>
                {t("devis.dueDate", language)}: {formatDate(devis.dueDate)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.thickDivider} />

        {/* Addresses */}
        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Émetteur</Text>
            <Text style={styles.addressName}>{artisan.company}</Text>
            <Text style={styles.addressLine}>{artisan.address}</Text>
            <Text style={styles.addressLine}>{artisan.postal} {artisan.city}</Text>
            <Text style={styles.addressLine}>{artisan.phone}</Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>{t("pdf.billTo", language)}</Text>
            <Text style={styles.addressName}>{devis.client.name}</Text>
            {devis.client.address && <Text style={styles.addressLine}>{devis.client.address}</Text>}
            {(devis.client.postal || devis.client.city) && (
              <Text style={styles.addressLine}>
                {[devis.client.postal, devis.client.city].filter(Boolean).join(" ")}
              </Text>
            )}
            {devis.client.email && <Text style={styles.addressLine}>{devis.client.email}</Text>}
            {devis.client.phone && <Text style={styles.addressLine}>{devis.client.phone}</Text>}
            {devis.client.tvaNumber && (
              <Text style={styles.addressLine}>TVA: {devis.client.tvaNumber}</Text>
            )}
          </View>
        </View>

        {/* Items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDescription]}>{t("devis.description", language)}</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>{t("devis.qty", language)}</Text>
          <Text style={[styles.tableHeaderText, styles.colUnit]}>{t("devis.unit", language)}</Text>
          <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>{t("devis.unitPrice", language)}</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>{t("devis.total", language)}</Text>
        </View>

        {devis.items.map((item, i) => (
          <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
            <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.cellUnit, styles.colUnit]}>{item.unit}</Text>
            <Text style={[styles.cellText, styles.colUnitPrice]}>{fmt(item.unitPrice)}</Text>
            <Text style={[styles.cellText, styles.colTotal]}>{fmt(item.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("devis.subtotal", language)}</Text>
            <Text style={styles.totalValue}>{fmt(devis.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA {devis.tvaRate}%</Text>
            <Text style={styles.totalValue}>{fmt(devis.tvaAmount)}</Text>
          </View>
          {devis.isRenovationPrincipal && (
            <View style={styles.tvaBadge}>
              <Text style={styles.tvaBadgeText}>
                Taux 3% — Rénovation logement principal (Art. 39 LTVA)
              </Text>
            </View>
          )}
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>{t("devis.totalTTC", language)}</Text>
            <Text style={styles.totalFinalValue}>{fmt(devis.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {devis.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>{t("devis.notes", language)}</Text>
            <Text style={styles.notesText}>{devis.notes}</Text>
          </View>
        )}

        {devis.signatureDataUrl && (
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>{t("devis.signatureBlock", language)}</Text>
            <View style={styles.signatureBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image (PDF output) has no alt prop */}
              <Image src={devis.signatureDataUrl} style={styles.signatureImage} />
            </View>
            {devis.signerName && <Text style={styles.signatureMeta}>{devis.signerName}</Text>}
            {devis.signedAt && (
              <Text style={styles.signatureMeta}>
                {t("devis.signatureDate", language)}: {formatDate(devis.signedAt)}
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Payment info */}
          {(artisan.iban || artisan.bic) && (
            <View style={styles.paymentBlock}>
              <Text style={styles.paymentTitle}>{t("pdf.paymentInfo", language)}</Text>
              {artisan.iban && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>IBAN</Text>
                  <Text style={styles.paymentValue}>{artisan.iban}</Text>
                </View>
              )}
              {artisan.bic && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>BIC</Text>
                  <Text style={styles.paymentValue}>{artisan.bic}</Text>
                </View>
              )}
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Bénéficiaire</Text>
                <Text style={styles.paymentValue}>{artisan.company}</Text>
              </View>
            </View>
          )}

          {/* Legal mentions */}
          <View style={styles.legalBlock}>
            <Text style={styles.legalTitle}>{t("pdf.legalMentions", language)}</Text>
            <View style={styles.legalGrid}>
              <Text style={styles.legalItem}>TVA : {artisan.tvaNumber}</Text>
              <Text style={styles.legalItem}>Matricule : {artisan.matricule}</Text>
              <Text style={styles.legalItem}>RCS : {artisan.rcs}</Text>
              <Text style={styles.legalItem}>Autorisation : {artisan.autorisation}</Text>
            </View>
            <Text style={styles.legalText}>{t("pdf.archiveNotice", language)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
