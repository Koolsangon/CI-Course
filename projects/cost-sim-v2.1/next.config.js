/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR mode required so /api/coach (Node.js runtime) is available in production.
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    typedRoutes: false
  },
  // Don't block production deploy on pre-existing JSX entity lint warnings.
  // Type errors still fail the build (next build runs tsc before lint).
  eslint: { ignoreDuringBuilds: true },
  // Amplify Hosting Compute does not forward branch env vars to the SSR Lambda
  // runtime. Inline GEMINI_API_KEY at build time so /api/coach can reach Gemini.
  // Safe because GEMINI_API_KEY is referenced only in server-only route code
  // (app/api/coach/route.ts) and will not leak into the client bundle.
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
  }
};

module.exports = nextConfig;
