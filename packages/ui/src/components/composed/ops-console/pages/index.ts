export {
  OpsAnalyticsView,
  type OpsAnalyticsViewProps,
  type AnalyticsKpis,
} from "./ops-analytics-view"
export {
  OpsShipmentsView,
  type OpsShipmentsViewProps,
  type ShipmentRow,
} from "./ops-shipments-view"
export {
  OpsManifestsView,
  type OpsManifestsViewProps,
  type ManifestRow,
} from "./ops-manifests-view"
export { OpsScanningView } from "./ops-scanning-view"
export {
  OpsInventoryView,
  type OpsInventoryViewProps,
  type HubInventory,
} from "./ops-inventory-view"
export {
  OpsExceptionsView,
  type OpsExceptionsViewProps,
  type ExceptionRow,
} from "./ops-exceptions-view"
export {
  OpsFinanceView,
  type OpsFinanceViewProps,
  type InvoiceRow,
  type AgingBucket,
} from "./ops-finance-view"
// OpsRateCardsView (v6 paper) retired in Phase 4 composition unification —
// the rates route renders the canonical V7OpsRateCards. RateCardRow now lives
// in `rates/v7-ops-rate-cards`.
// OpsCustomersView (v6 paper) retired in Phase 4 — customers route renders
// V7OpsCustomers; CustomerRow lives in `customers/v7-ops-customers`.
export {
  OpsManagementView,
  type OpsManagementViewProps,
  type StaffRow,
} from "./ops-management-view"
export {
  OpsNotificationsView,
  type OpsNotificationsViewProps,
  type Channel,
  type SystemService,
} from "./ops-notifications-view"
export {
  OpsSettingsView,
  type OpsSettingsViewProps,
} from "./ops-settings-view"
export {
  OpsWhatsAppFailedSendsView,
  type OpsWhatsAppFailedSendsViewProps,
} from "./ops-whatsapp-failed-sends-view"
export {
  ContactLeadsView,
  type ContactLeadsViewProps,
} from "./contact-leads-view"
