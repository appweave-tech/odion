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
      // Production origin must be listed; LAN entries are dev-only.
      allowedOrigins: [
        'odion.appweave.tech',
        ...(process.env.NODE_ENV !== 'production'
          ? ['localhost:3010', '192.168.68.53:3010']
          : []),
      ],
    },
  },
};

export default nextConfig;
