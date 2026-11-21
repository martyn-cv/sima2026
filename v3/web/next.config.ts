import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@sima/cliente", "@sima/ui"],
  reactStrictMode: true,
  typedRoutes: false,
};
export default config;
