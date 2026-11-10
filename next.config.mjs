/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Disables TypeScript build failure on Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disables ESLint build failure on Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
