/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/characters/:characterId/sets/:setId',
        destination: '/characters/:characterId/galleries/:setId',
        permanent: true,
      },
      {
        source: '/galleries',
        destination: '/characters',
        permanent: true,
      },
      {
        source: '/galleries/:path*',
        destination: '/characters/:path*',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig