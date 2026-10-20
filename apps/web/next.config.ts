import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/PROYECTO_BIGDATA" : "",
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
};

export default nextConfig;
