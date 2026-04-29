/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const nextConfig = {
  output: isDev ? undefined : 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    typedRoutes: false
  }
};

module.exports = nextConfig;
