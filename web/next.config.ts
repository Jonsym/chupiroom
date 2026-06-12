import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in /web inside a repo that also has the Expo app (and its
  // own lockfile) at the root. Pin the workspace root to /web so Next traces
  // only this app — matches the Vercel "Root Directory = web" deployment.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
