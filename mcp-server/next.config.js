/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Required for MCP
    serverComponentsExternalPackages: [
      "@modelcontextprotocol/sdk",
      "mcp-handler",
    ],
  },
};

export default nextConfig;
