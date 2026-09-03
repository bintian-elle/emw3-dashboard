import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
