import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Compile workspace packages that ship raw TS (ui is consumed source-first).
  transpilePackages: ['@aie/ui', '@aie/core'],
  // Standalone output → tiny Docker images when we containerize web.
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
