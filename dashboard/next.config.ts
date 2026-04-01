import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const dashboardNodeModules = path.join(configDir, "node_modules");

const nextConfig: NextConfig = {
  turbopack: {
    root: configDir,
    resolveAlias: {
      tailwindcss: path.join(dashboardNodeModules, "tailwindcss"),
      "@tailwindcss/postcss": path.join(
        dashboardNodeModules,
        "@tailwindcss",
        "postcss"
      ),
    },
  },
};

export default nextConfig;
