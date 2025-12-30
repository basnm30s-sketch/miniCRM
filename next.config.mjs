/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for Electron builds, not for Vercel (which needs API routes)
  // Set NEXT_EXPORT=true environment variable for Electron builds
  ...(process.env.NEXT_EXPORT === 'true' ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Proxy API requests to Express server during development
  async rewrites() {
    // Disable rewrites for:
    // 1. Electron builds (static export - NEXT_EXPORT=true)
    // 2. Production deployments (Render/Vercel - use Next.js API routes instead)
    if (process.env.NEXT_EXPORT === 'true' || process.env.NODE_ENV === 'production') {
      return []
    }
    // Only enable rewrites in development when Express server is running
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

export default nextConfig
