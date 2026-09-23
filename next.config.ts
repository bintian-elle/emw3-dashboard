import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep production builds within the memory available on the small
    // self-hosted deployment instance. Development still uses Turbopack.
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
  },
  webpack(config, { dev }) {
    // The deployment volume is intentionally small. A production build cache
    // is disposable and can otherwise consume hundreds of MB before exit.
    if (!dev) config.cache = false;
    return config;
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      ],
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.squarespace-cdn.com", pathname: "/content/**" },
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" },
      { protocol: "https", hostname: "shopping.googleusercontent.com", pathname: "/image" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "tpc.googlesyndication.com", pathname: "/simgad/**" },
      { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "i.redd.it", pathname: "/**" },
      { protocol: "https", hostname: "preview.redd.it", pathname: "/**" },
      { protocol: "https", hostname: "d3k81ch9hvuctc.cloudfront.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
