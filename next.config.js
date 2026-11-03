/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy static demo lives under /legacy and is not imported by the Next build.
  experimental: {
    outputFileTracingIncludes: {
      '/api/saved/*': ['./save-webpage/*.html', './public/saved/*'],
      '/api/fetch': ['./save-webpage/*.html', './public/saved/*'],
    },
    outputFileTracingExcludes: {
      '*': ['./legacy/**'],
    },
  },
};

module.exports = nextConfig;
