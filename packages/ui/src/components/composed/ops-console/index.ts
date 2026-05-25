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
export {
  OpsSkeleton,
  OpsSkeletonRow,
  OpsSkeletonStatCard,
} from "./ops-skeleton"
export { OpsEmptyState, type OpsEmptyStateProps } from "./ops-empty-state"
// OpsErrorState (v6 paper) retired in Phase 6 — last orphan, no consumers; v7
// surfaces use EmptyState for error rendering.
export {
  OpsAccessFallback,
  type OpsAccessFallbackProps,
  type OpsAccessFallbackReason,
} from "./ops-access-fallback"
export { OpsDetailFrame, type OpsDetailFrameProps } from "./ops-detail-frame"
export {
  OpsTimeline,
  type OpsTimelineProps,
  type TimelineEvent,
} from "./ops-timeline"
export { OpsShipmentStepper } from "./ops-shipment-stepper"
export {
  OpsPanelTabs,
  OpsPanelTabsList,
  OpsPanelTabsTrigger,
  OpsPanelTabsContent,
} from "./ops-panel-tabs"
export * from "./pages"
export * from "./forms"
