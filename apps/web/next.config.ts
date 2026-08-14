import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Принудительно включаем папки методологии из корня монорепо в сборку Vercel Serverless Functions
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./00_SYSTEM/**/*",
      "./01_KNOWLEDGE/**/*",
      "./02_RESEARCH/**/*",
      "./03_AUDIENCE/**/*",
      "./04_CONTENT/**/*",
      "./05_SEO/**/*",
      "./06_ANALYTICS/**/*",
      "./07_AUTOMATION/**/*",
      "./08_INPUT/**/*",
      "../../00_SYSTEM/**/*",
      "../../01_KNOWLEDGE/**/*",
      "../../02_RESEARCH/**/*",
      "../../03_AUDIENCE/**/*",
      "../../04_CONTENT/**/*",
      "../../05_SEO/**/*",
      "../../06_ANALYTICS/**/*",
      "../../07_AUTOMATION/**/*",
      "../../08_INPUT/**/*",
    ],
  },
};

export default nextConfig;