// MVP forms (OpsShipmentForm / OpsManifestForm / OpsInvoiceForm) were
// removed 2026-05-13 after the multi-step wizard restoration.
// See docs/v6-mvp-regression-audit.md.
//
// Customer + rate-card surfaces never existed as wizards in v6 (these
// /create routes are net-new in /ops-console), so their flat forms remain.
export {
  OpsCustomerForm,
  opsCustomerFormSchema,
  type OpsCustomerFormInput,
} from "./ops-customer-form"
export {
  OpsRateCardForm,
  opsRateCardFormSchema,
  type OpsRateCardFormInput,
} from "./ops-rate-card-form"
