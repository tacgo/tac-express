export * from "./rbac"
export * from "./auth.service"
export type { AuthService } from "./auth.service"

// Sentry instrumentation surface (issue #110). Two exports:
//   - registerSentry(emitter) — apps wire this at startup
//   - captureRbacDenial(input) — denial-path helper that emits + returns RbacDeniedError
export {
  registerSentry,
  getRegisteredEmitter,
  type TaggedEmitter,
  type TagMap,
} from "./sentry-tagger"
export {
  captureRbacDenial,
  RbacDeniedError,
  RBAC_DENIAL_TAG_KEYS,
  type CaptureRbacDenialInput,
} from "./rbac-instrumentation"
