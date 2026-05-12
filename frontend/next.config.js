/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces .next/standalone/ with a self-contained
  // server.js + the minimal node_modules subset Next actually needs at
  // runtime. The Docker image ships only this, no full node_modules tree.
  // Required for the production container; harmless for `pnpm dev`.
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
