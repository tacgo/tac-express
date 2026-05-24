export {
  OpsAnalyticsView,
  type OpsAnalyticsViewProps,
  type AnalyticsKpis,
} from "./ops-analytics-view"
// OpsShipmentsView (v6 paper) retired in Phase 5 — shipments route renders
// V7OpsShipments; ShipmentRow lives in `shipments/v7-ops-shipments`.
// OpsManifestsView (v6 paper) retired in Phase 5 — manifests route renders
// V7OpsManifests; ManifestRow lives in `manifests/v7-ops-manifests`.
export { OpsScanningView } from "./ops-scanning-view"
// OpsInventoryView (v6 paper) retired in Phase 5 — inventory route renders
// V7OpsInventory; HubInventory lives in `inventory/v7-ops-inventory`.
export {
  OpsExceptionsView,
  type OpsExceptionsViewProps,
  type ExceptionRow,
} from "./ops-exceptions-view"
// OpsFinanceView (v6 paper) retired in Phase 5 — finance route renders
// V7OpsFinance; InvoiceRow + AgingBucket live in `finance/v7-ops-finance`.
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
