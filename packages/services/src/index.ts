// Sentry instrumentation surface (issue #110). Two exports:
//   - registerSentry(emitter) — apps wire this at startup
//   - withRpc / captureSupabaseRpcError — RPC-failure capture helpers
export {
  registerSentry,
  getRegisteredEmitter,
  type TaggedEmitter,
  type TagMap,
} from "./shared/sentry-tagger"
export {
  withRpc,
  captureSupabaseRpcError,
  SupabaseRpcError,
  SUPABASE_RPC_TAG_KEYS,
  RPC_UNKNOWN_ERROR_CODE,
} from "./shared/with-rpc"

export * from "./query-client"
export * from "./stores/ui.store"
export * from "./stores/hub.store"
export * from "./stores/notification.store"
export * from "./stores/scan-queue.store"

// Domain services
export * from "./dashboard.service"
export * from "./shipment.service"
export * from "./manifest.service"
export * from "./invoice.service"
export * from "./customer.service"
export * from "./exception.service"
export * from "./rate-card.service"
export * from "./analytics.service"
export * from "./orbital.service"
export * from "./admin.service"
export * from "./scan-sync.service"
export * from "./awb"
export * from "./public-tracking.service"
export * from "./realtime.service"

// Infrastructure services (added April 2026)
export * from "./hub.service"
export * from "./audit.service"
export * from "./webhook.service"
export * from "./api-key.service"
export * from "./notification.service"
export * from "./saved-view.service"
export * from "./attachment.service"
export * from "./payment.service"
export * from "./einvoice.service"
export * from "./gst"
export * from "./note.service"
export * from "./booking.service"
export * from "./shift-report.service"
