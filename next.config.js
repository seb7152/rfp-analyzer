/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals || {}]),
      'xlsx',
    ];
    return config;
  },
  serverComponentsExternalPackages: ["xlsx"],
};

module.exports = nextConfig;
