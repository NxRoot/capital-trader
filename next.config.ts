import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  experimental: { serverSourceMaps: false },
  bundlePagesRouterDependencies: true,
  serverExternalPackages: [],
  reactCompiler: false,
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: ['*'],
  logging: {
    fetches: { fullUrl: false, hmrRefreshes: false },
    browserToTerminal: false,
    incomingRequests: false,
    serverFunctions: true,
  },
};

export default nextConfig;
