/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
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
  weback: (config) => {
    if (process.env.BUILD_TARGET === 'mobile') {
      // Ignore API and Sitemap
      config.module.rules.push({
        test: /app\/(api|sitemap)/,
        loader: 'ignore-loader',
      });
      // Rule: Ignore everything EXCEPT dashboard, login, signup, and root page
      config.module.rules.push({
        test: /app\/(?!.*(dashboard|login|signup)).*\/page\.(js|jsx|ts|tsx)$/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;