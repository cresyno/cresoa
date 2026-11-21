/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  output: process.env.BUILD_TARGET === 'mobile' ? 'export' : undefined,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config) => {
    if (process.env.BUILD_TARGET === 'mobile') {
      config.module.rules.push({
        test: /app\/api/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
