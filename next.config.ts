import type { NextConfig } from 'next';
import { trustedImagePatterns } from './lib/trusted-image-patterns';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: trustedImagePatterns(process.env.R2_PUBLIC_URL),
  },
};

export default nextConfig;
