import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix Turbopack multi-lockfile root detection when running as a subdirectory.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
