import type { NextConfig } from "next";

// Behind aifekr.com this app serves the new-design pages; the main site
// forwards /_v2/* here with the prefix removed, so built assets are referenced
// under /_v2. Unset for standalone development.
const nextConfig: NextConfig = {
  assetPrefix: process.env.UI_V2_ASSET_PREFIX || undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
