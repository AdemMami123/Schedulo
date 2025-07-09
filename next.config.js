/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
ignoreDuringBuilds: true,

},
typescript: {
  ignoreBuildErrors: true,
},
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ["nodemailer"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'child_process' etc on the client
      // to prevent errors like "Module not found: Can't resolve 'child_process'"
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
