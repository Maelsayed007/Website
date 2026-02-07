
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent DNS prefetch leaking
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Prevent clickjacking attacks
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
      },
      {
        source: '/admin/:path*',
        destination: '/dashboard/:path*',
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'catamphetamine.ip-country-flags.workers.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
};

export default nextConfig;
