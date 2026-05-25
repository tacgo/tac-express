export { OpsShell, type OpsShellProps } from "./ops-shell"
// OpsSidebar removed — consolidated into the shared `<Sidebar>` at
// `@workspace/ui/components/composed/sidebar`. Import that instead.
export { OpsTopbar, type OpsTopbarProps } from "./ops-topbar"
export { OpsFrame, WorkflowShell, type OpsFrameProps } from "./ops-frame"
export { OpsPageHead, type OpsPageHeadProps } from "./ops-page-head"
export { OpsButton, opsButtonVariants, type OpsButtonProps } from "./ops-button"
export { OpsBadge, opsBadgeVariants, type OpsBadgeProps } from "./ops-badge"
export { OpsCard, opsCardVariants, type OpsCardProps } from "./ops-card"
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
export { OpsTabs, type OpsTabsProps } from "./ops-tabs"
export {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "./ops-table"
export {
  OpsFieldInput,
  OpsFieldSelect,
  OpsFieldLabel,
  type OpsFieldInputProps,
  type OpsFieldSelectProps,
  type OpsFieldLabelProps,
} from "./ops-field"
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
