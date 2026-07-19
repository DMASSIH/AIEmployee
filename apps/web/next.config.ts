import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Compile workspace packages that ship raw TS (ui is consumed source-first).
  transpilePackages: ['@aie/ui', '@aie/core'],
  // Standalone output → tiny Docker images when we containerize web. Its file
  // tracing creates symlinks, which Windows blocks without Developer Mode — so
  // keep it for Linux/CI (where Docker builds happen) and skip on Windows dev.
  output: process.platform === 'win32' ? undefined : 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
