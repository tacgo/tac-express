// OpsAnalyticsView (v6 paper) retired in Phase 7 — analytics route renders
// V7OpsAnalytics; AnalyticsKpis lives in `analytics/v7-ops-analytics`.
// OpsShipmentsView (v6 paper) retired in Phase 5 — shipments route renders
// V7OpsShipments; ShipmentRow lives in `shipments/v7-ops-shipments`.
// OpsManifestsView (v6 paper) retired in Phase 5 — manifests route renders
// V7OpsManifests; ManifestRow lives in `manifests/v7-ops-manifests`.
// OpsScanningView (v6 paper) retired in Phase 8 — scanning route renders
// V7OpsScanning, in `scanning/v7-ops-scanning`.
// OpsInventoryView (v6 paper) retired in Phase 5 — inventory route renders
// V7OpsInventory; HubInventory lives in `inventory/v7-ops-inventory`.
// OpsExceptionsView (v6 paper) retired in Phase 6 — exceptions route renders
// V7OpsExceptions; ExceptionRow lives in `exceptions/v7-ops-exceptions`.
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
// OpsNotificationsView (v6 paper) retired in Phase 6 — notifications route
// renders V7OpsNotifications; Channel + SystemService live in
// `notifications/v7-ops-notifications`.
// OpsSettingsView (v6 paper) retired in Phase 6 — settings route renders
// V7OpsSettings, in `settings/v7-ops-settings`.
// OpsWhatsAppFailedSendsView (v6 paper) retired in Phase 9 — failed-sends route
// renders V7OpsWhatsAppFailedSends, in `whatsapp/v7-ops-whatsapp-failed-sends`.
// ContactLeadsView (v6 paper) retired in Phase 6 — support route renders
// V7ContactLeads, in `support/v7-contact-leads`.
