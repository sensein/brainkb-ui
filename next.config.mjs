/** @type {import('next').NextConfig} */

import withYAML from 'next-yaml';

const nextConfig = withYAML({
  reactStrictMode: true,
  experimental: {
    // oxigraph loads its .wasm from its own directory at runtime; bundling it
    // breaks that path, so require it from node_modules on the server.
    serverComponentsExternalPackages: ['oxigraph'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Disable the fs and path modules for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Externalize ws package for server-side to avoid bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('ws');
    }
    return config;
  },
}); 

export default nextConfig;
