/* global process */
import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  allowedDevOrigins: ["192.168.1.246", "localhost", "127.0.0.1", "*.localhost", "*.127.0.0.1"],
}

export default withSentryConfig(nextConfig, {
  org: "tac-an",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
})
