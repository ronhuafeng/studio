// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow both the root and every subdomain of cloudworkstations.dev
  allowedDevOrigins: [
    'cloudworkstations.dev',
    '*.cloudworkstations.dev',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
