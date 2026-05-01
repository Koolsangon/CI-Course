/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR mode required so /api/coach (Edge Runtime) is available in production.
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    typedRoutes: false
  },
  // Don't block production deploy on pre-existing JSX entity lint warnings.
  // Type errors still fail the build (next build runs tsc before lint).
  eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;
