/**
 * Shared company + bank config readers. Both the PDF generator
 * (`packages/services/src/pdf/invoice-pdf.tsx`) and the HTML invoice print
 * view (`packages/ui/src/components/composed/finance/invoice-print-view.tsx`)
 * must read from the same source of truth, or the same legal tax document
 * will render with two different sets of company details.
 *
 * Reading at runtime (not module init) so server components that import this
 * pick up the actual deployed env at request time, and `assertCompanyConfig`
 * can be invoked at any time without caching a stale read.
 */

const PLACEHOLDER = "[unset]"

function envValue(key: string): string {
  return (typeof process !== "undefined" && process.env?.[key]?.trim()) || PLACEHOLDER
}

export interface CompanyConfig {
  legalName: string
  addressLines: string[]
  tel: string
  email: string
  web: string
  gstin: string
  pan: string
  cin: string
  hsn: string
}

export interface BankConfig {
  name: string
  account: string
  ifsc: string
  swift: string
  upi: string
}

export function readCompanyConfig(): CompanyConfig {
  const addressRaw = envValue("COMPANY_ADDRESS")
  return {
    legalName: envValue("COMPANY_LEGAL_NAME"),
    addressLines:
      addressRaw === PLACEHOLDER
        ? []
        : addressRaw.split("|").map((s) => s.trim()).filter(Boolean),
    tel: envValue("COMPANY_TEL"),
    email: envValue("COMPANY_EMAIL"),
    web: envValue("COMPANY_WEB"),
    gstin: envValue("COMPANY_GSTIN"),
    pan: envValue("COMPANY_PAN"),
    cin: envValue("COMPANY_CIN"),
    hsn: "996511",
  }
}

export function readBankConfig(): BankConfig {
  return {
    name: envValue("BANK_NAME"),
    account: envValue("BANK_ACCOUNT"),
    ifsc: envValue("BANK_IFSC"),
    swift: envValue("BANK_SWIFT"),
    upi: envValue("BANK_UPI"),
  }
}

export const COMPANY_CONFIG_PLACEHOLDER = PLACEHOLDER

export function assertCompanyAndBankConfig(): void {
  const company = readCompanyConfig()
  const bank = readBankConfig()
  const required: Array<[string, string]> = [
    ["COMPANY_LEGAL_NAME", company.legalName],
    ["COMPANY_GSTIN", company.gstin],
    ["COMPANY_PAN", company.pan],
    ["COMPANY_CIN", company.cin],
    ["COMPANY_TEL", company.tel],
    ["COMPANY_EMAIL", company.email],
    ["COMPANY_WEB", company.web],
    ["BANK_NAME", bank.name],
    ["BANK_ACCOUNT", bank.account],
    ["BANK_IFSC", bank.ifsc],
    ["BANK_SWIFT", bank.swift],
    ["BANK_UPI", bank.upi],
  ]
  const missing = required.filter(([, v]) => !v || v === PLACEHOLDER).map(([k]) => k)
  if (
    company.addressLines.length === 0 ||
    company.addressLines.some((line) => line === PLACEHOLDER)
  ) {
    missing.push("COMPANY_ADDRESS")
  }
  if (missing.length > 0) {
    throw new Error(
      `Invoice rendering blocked — missing required company/bank env vars: ${missing.join(", ")}. ` +
        `Set these in apps/dashboard/.env.local (see .env.example).`,
    )
  }
}
