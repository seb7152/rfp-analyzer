/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase API payload size limit for file uploads (default is 4.5MB on Vercel)
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    // Mark xlsx as external to prevent bundling in server context
    config.externals = [
      ...(Array.isArray(config.externals)
        ? config.externals
        : [config.externals || {}]),
      "xlsx",
    ];
    return config;
  },
};

module.exports = nextConfig;
