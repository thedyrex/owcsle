import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'owcsle.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'cdn.owcsle.xyz',
      },
      {
        protocol: 'https',
        hostname: 'vectorflags.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'dmssaukxppdmfsgrajlp.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow Discord to embed the /discord route
        source: '/discord',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://discord.com; img-src 'self' https: data:",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
