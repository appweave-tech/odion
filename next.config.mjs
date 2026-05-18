/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow LAN access during dev (phone-testing over Wi-Fi).
  // Add your dev machine's LAN IP if it changes.
  allowedDevOrigins: ['192.168.68.53', 'localhost'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      // Server Actions reject requests whose Origin doesn't match.
      // Phones hit the LAN IP, so it must be in this list.
      allowedOrigins: [
        'localhost:3010',
        '192.168.68.53:3010',
      ],
    },
  },
};

export default nextConfig;
