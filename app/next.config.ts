import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Ensure static files are properly served
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
