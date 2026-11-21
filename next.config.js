/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
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
