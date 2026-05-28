export { OpsShell, type OpsShellProps } from "./ops-shell"
// OpsSidebar removed — consolidated into the shared `<Sidebar>` at
// `@workspace/ui/components/composed/sidebar`. Import that instead.
export { OpsTopbar, type OpsTopbarProps } from "./ops-topbar"
// OpsFrame (v6 paper) retired in Phase 4-C — all consumers migrated to PageShell + inline <header>.
// OpsPageHead (v6 paper) retired in Phase 4-C — pages now render inline <h1> directly.
export { WorkflowShell, type WorkflowShellProps } from "./workflow-shell"
// OpsButton kept — still used by OpsUpcomingCalendar, OpsShipmentDetailLive, OpsInvoiceDetailLive.
export { OpsButton, opsButtonVariants, type OpsButtonProps } from "./ops-button"
// OpsBadge (v6 paper) retired in Phase 4-C — last consumer (OpsManagementView)
// archived; detail routes use the shadcn Badge primitive.
// OpsCard (v6 paper) retired in Phase 4-C — last consumers were OpsManagementView
// (archived) and the form schema-home JSX (stripped in Phase 4-B).
// OpsStatCard (v6 paper) retired in Phase 6 — last orphan, no consumers; v7
// KPI surfaces use StatCard.
// OpsDashboard (v6 paper) retired in Phase 5 — dashboard renders V7OpsDashboard.
export { OpsGrowthAreaChart, type OpsGrowthAreaChartProps } from "./ops-growth-chart"
export { OpsVolumeBarChart, type OpsVolumeBarChartProps } from "./ops-volume-chart"
export {
  OpsUpcomingCalendar,
  type OpsUpcomingCalendarProps,
  type UpcomingOpItem,
} from "./ops-upcoming-calendar"
export {
  OpsShipmentBarChart,
  type OpsShipmentBarChartProps,
} from "./ops-shipment-bar-chart"
export {
  OpsRevenueRadialChart,
  type OpsRevenueRadialChartProps,
} from "./ops-revenue-radial-chart"
// OpsTabs (v6 paper) retired in Phase 4-C — sole consumer was OpsManagementView
// (archived); v7 surfaces use the shadcn Tabs primitive.
// OpsTable suite (v6 paper) retired in Phase 4-C — sole consumer was
// OpsManagementView (archived); v7 surfaces use the shadcn Table primitive.
// OpsField* (v6 paper) retired in Phase 4-C — consumers were OpsManagementView
// (archived) and the form schema-home JSX (stripped in Phase 4-B).
// OpsKbd (v6 paper) retired in Phase 6 — V7OpsSettings inlines <kbd> tokens
// rather than the Ops* primitive.
// OpsSkeleton/Row/StatCard (v6 paper) retired in Phase 10c — detail routes use
// the v7 Skeleton primitive.
// OpsEmptyState (v6 paper) retired in Phase 10c — detail routes use the v7
// EmptyState primitive.
// OpsErrorState (v6 paper) retired in Phase 6 — last orphan, no consumers; v7
// surfaces use EmptyState for error rendering.
export {
  OpsAccessFallback,
  type OpsAccessFallbackProps,
  type OpsAccessFallbackReason,
} from "./ops-access-fallback"
// Phase 10c — v6 paper detail primitives retired (shipments/[id] was the last
// consumer; detail routes now compose v7 directly):
//   OpsDetailFrame     → DetailShell (apps/dashboard/components/ops-detail-shell)
//   OpsTimeline        → TrackingTimeline (composed/shipments/tracking-timeline)
//   OpsShipmentStepper → ShipmentStepper (composed/shipments/shipment-stepper)
//   OpsPanelTabs*      → ShipmentDetailTabs (composed/shipments/shipment-detail-tabs)
export * from "./pages"
export * from "./forms"
