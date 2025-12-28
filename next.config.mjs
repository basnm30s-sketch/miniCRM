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
}

export default nextConfig
