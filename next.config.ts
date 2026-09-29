import type { NextConfig } from 'next';
import { trustedImagePatterns } from './lib/trusted-image-patterns';
import { siteSecurityHeaders } from './lib/security-headers';

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: siteSecurityHeaders(process.env.VERCEL_ENV === 'production') }];
  },
  images: {
    remotePatterns: trustedImagePatterns(process.env.R2_PUBLIC_URL),
  },
};

export default nextConfig;
