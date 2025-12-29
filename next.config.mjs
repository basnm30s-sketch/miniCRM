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
    // Only add rewrites if not doing a static export (Electron build)
    if (process.env.NEXT_EXPORT === 'true') {
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

export default nextConfig
