/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from backend — localhost in dev, Cloud Run in production
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.run.app',   // matches any Cloud Run URL
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
