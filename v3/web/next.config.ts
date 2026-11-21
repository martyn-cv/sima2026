import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@sima/cliente"],
  reactStrictMode: true,
  typedRoutes: false,
};
export default config;
