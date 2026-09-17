import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GATE 8 — required for the Docker runner stage to work off a minimal
  // `.next/standalone` output rather than needing the full node_modules
  // tree copied into the final image.
  output: "standalone",
};

export default nextConfig;
