/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  webpack: (config) => {
    if (process.env.BUILD_TARGET === 'mobile') {
      config.module.rules.push({
        test: /[\\/]app[\\/](api|api_backup|sitemap)/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;