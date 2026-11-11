/** @type {import('next').NextConfig} */

import withYAML from 'next-yaml';

const nextConfig = withYAML({
  reactStrictMode: true,
  async redirects() {
    // The privacy policy moved into the legal section; keep the old link working.
    return [{ source: '/privacy-policy', destination: '/legal/privacy-policy', permanent: true }];
  },
  // oxigraph loads its .wasm from its own directory at runtime; bundling it
  // breaks that path, so require it from node_modules on the server.
  serverExternalPackages: ['oxigraph'],
  // The .yaml imports go through next-yaml's webpack loader, so dev and build
  // run with --webpack (package.json) rather than Turbopack.
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
