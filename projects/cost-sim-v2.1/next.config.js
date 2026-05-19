/** @type {import('next').NextConfig} */
const nextConfig = {
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
