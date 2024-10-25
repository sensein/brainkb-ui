/** @type {import('next').NextConfig} */

import withYAML from 'next-yaml';

const nextConfig = withYAML({
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      // Disable the fs and path modules for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
}); 

export default nextConfig;
