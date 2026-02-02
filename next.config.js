/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: ['13.229.100.153', 'localhost', '127.0.0.1'],
  },
};

module.exports = nextConfig;
