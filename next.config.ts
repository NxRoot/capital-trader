import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  experimental: { serverSourceMaps: false },
  reactCompiler: false,
  reactStrictMode: false,
  allowedDevOrigins: ['*'],
  devIndicators: false,
  bundlePagesRouterDependencies: true,
  serverExternalPackages: [],
  logging: {
    fetches: { fullUrl: false, hmrRefreshes: false },
    browserToTerminal: false,
    incomingRequests: false,
    serverFunctions: true,
  },
};

export default nextConfig;
