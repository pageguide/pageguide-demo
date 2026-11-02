/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy static demo lives under /legacy and is not imported by the Next build.
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./legacy/**'],
    },
  },
};

module.exports = nextConfig;
