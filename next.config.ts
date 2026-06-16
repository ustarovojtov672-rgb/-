import type { NextConfig } from "next";

const staticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
