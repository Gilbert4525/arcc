import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Ensure static files are properly served
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Enable service worker
  experimental: {
    webpackBuildWorker: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        url: false,
        buffer: false,
        util: false,
        querystring: false,
        path: false,
        os: false,
      };
      
      // Exclude web-push from client bundle
      config.externals = config.externals || [];
      config.externals.push('web-push');
    }
    
    return config;
  },
};

export default nextConfig;
