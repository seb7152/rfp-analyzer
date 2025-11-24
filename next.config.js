/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    // Mark xlsx as external to prevent bundling in server context
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals || {}]),
      'xlsx',
    ];
    return config;
  },
};

module.exports = nextConfig;
