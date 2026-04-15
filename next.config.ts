import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.zoya.in",
        pathname: "/on/demandware.static/**",
      },
    ],
  },
};

export default nextConfig;
