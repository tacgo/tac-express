// Customer statement PDF — used by both the in-browser download path and
// the scheduled `daily-statement` Edge Function. Pure presentational.

import * as React from "react"
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

// Register fonts to keep the PDF visually identical to the dashboard. Fonts
// must be embedded in the bundle or loaded via URL — we use the Google Fonts
// TTF endpoints so this works in both the browser and Edge Function runtimes.
Font.register({
  family: "Space Grotesk",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mDoQDjQSkFtoMM3T6r8E7mPb14ftSt.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mDoQDjQSkFtoMM3T6r8E7mPb14ftWt.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mDoQDjQSkFtoMM3T6r8E7mPb14ftbt.ttf",
      fontWeight: 700,
    },
  ],
})

Font.register({
  family: "JetBrains Mono",
  src: "https://fonts.gstatic.com/s/jetbrainsmono/v22/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.ttf",
  fontWeight: 400,
})

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#000000",
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontFamily: "Space Grotesk",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 8,
    marginBottom: 12,
  },
  monoMicro: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#444",
  },
  brand: {
    fontFamily: "Space Grotesk",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  section: {
    marginTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  sectionTitle: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#666",
    marginBottom: 4,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  table: {
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellMono: {
    flex: 1,
    fontSize: 9,
    fontFamily: "JetBrains Mono",
  },
  tableCellRight: {
    flex: 1,
    fontSize: 9,
    fontFamily: "JetBrains Mono",
    textAlign: "right",
  },
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: "#000",
    fontFamily: "JetBrains Mono",
    fontSize: 10,
    fontWeight: 700,
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1,
    color: "#666",
  },
})

export interface CustomerStatementLine {
  invoiceNumber: string
  awbNumber: string
  issueDate: string
  dueDate?: string
  totalAmount: number
  paidAmount: number
  balance: number
  status: string
}

export interface CustomerStatementProps {
  customerName: string
  customerGstin?: string
  customerAddress?: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  openingBalance: number
  lines: CustomerStatementLine[]
  closingBalance: number
  companyName?: string
  companyAddress?: string
  companyGstin?: string
}

const fmtINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

export function CustomerStatementDocument(props: CustomerStatementProps) {
  return (
    <Document
      title={`Statement-${props.customerName}-${props.periodStart}`}
      author={props.companyName ?? "TAC Express"}
      creator="TAC Express Dashboard"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.monoMicro}>
              {(props.companyName ?? "TAC EXPRESS").toUpperCase()} //
              CUSTOMER STATEMENT
            </Text>
            <Text style={styles.brand}>Customer Statement</Text>
            {props.companyAddress && (
              <Text style={styles.monoMicro}>
                {props.companyAddress.toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.monoMicro}>Period</Text>
            <Text style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>
              {props.periodStart} → {props.periodEnd}
            </Text>
            <Text style={[styles.monoMicro, { marginTop: 4 }]}>
              Generated
            </Text>
            <Text style={{ fontFamily: "JetBrains Mono", fontSize: 9 }}>
              {props.generatedAt}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILL TO</Text>
          <Text style={{ fontSize: 12, fontWeight: 600 }}>
            {props.customerName}
          </Text>
          {props.customerGstin && (
            <Text style={{ fontFamily: "JetBrains Mono", fontSize: 9 }}>
              GSTIN · {props.customerGstin}
            </Text>
          )}
          {props.customerAddress && (
            <Text style={{ fontSize: 9, color: "#444" }}>
              {props.customerAddress}
            </Text>
          )}
        </View>

        {/* Opening balance */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: "#000",
          }}
        >
          <Text style={styles.monoMicro}>OPENING BALANCE</Text>
          <Text style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>
            {fmtINR.format(props.openingBalance)}
          </Text>
        </View>

        {/* Lines */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.monoMicro, { flex: 1 }]}>INVOICE</Text>
            <Text style={[styles.monoMicro, { flex: 1 }]}>AWB</Text>
            <Text style={[styles.monoMicro, { flex: 1 }]}>ISSUE</Text>
            <Text style={[styles.monoMicro, { flex: 1 }]}>DUE</Text>
            <Text style={[styles.monoMicro, { flex: 1, textAlign: "right" }]}>
              TOTAL
            </Text>
            <Text style={[styles.monoMicro, { flex: 1, textAlign: "right" }]}>
              PAID
            </Text>
            <Text style={[styles.monoMicro, { flex: 1, textAlign: "right" }]}>
              BALANCE
            </Text>
          </View>
          {props.lines.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: 7,
                    textAlign: "center",
                    color: "#999",
                    fontFamily: "JetBrains Mono",
                    fontSize: 9,
                  },
                ]}
              >
                NO INVOICES IN PERIOD
              </Text>
            </View>
          ) : (
            props.lines.map((l) => (
              <View key={l.invoiceNumber} style={styles.tableRow}>
                <Text style={styles.tableCellMono}>{l.invoiceNumber}</Text>
                <Text style={styles.tableCellMono}>{l.awbNumber}</Text>
                <Text style={styles.tableCellMono}>{l.issueDate}</Text>
                <Text style={styles.tableCellMono}>{l.dueDate ?? "—"}</Text>
                <Text style={styles.tableCellRight}>
                  {fmtINR.format(l.totalAmount)}
                </Text>
                <Text style={styles.tableCellRight}>
                  {fmtINR.format(l.paidAmount)}
                </Text>
                <Text style={styles.tableCellRight}>
                  {fmtINR.format(l.balance)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Closing balance */}
        <View style={styles.totalsRow}>
          <Text style={{ flex: 6 }}>CLOSING BALANCE</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>
            {fmtINR.format(props.closingBalance)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            {(props.companyName ?? "TAC EXPRESS").toUpperCase()}{" "}
            {props.companyGstin ? `· GSTIN ${props.companyGstin}` : ""}
          </Text>
          <Text>PAGE 1 OF 1</Text>
        </View>
      </Page>
    </Document>
  )
}
