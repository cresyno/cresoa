/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config) => {
    if (process.env.BUILD_TARGET === 'mobile') {
      // 1. Ignore API and Sitemap
      config.module.rules.push({
        test: /app\/(api|sitemap)/,
        loader: 'ignore-loader',
      });
      // 2. Ignore EVERYTHING except dashboard, login, signup, and the root page
      config.module.rules.push({
        test: /app\/(?!.*(dashboard|login|signup)).*\/page\.(js|jsx|ts|tsx)$/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
