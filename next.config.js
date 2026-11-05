/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/saved/:id.json.gz', headers: [
      { key: 'Content-Type', value: 'application/json; charset=utf-8' },
      { key: 'Content-Encoding', value: 'gzip' },
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ] }];
  },
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
