/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  allowedDevOrigins: ["192.168.1.246", "localhost", "127.0.0.1", "*.localhost", "*.127.0.0.1"],
}

export default nextConfig
