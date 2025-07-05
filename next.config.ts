// next.config.ts

import { NextConfig } from 'next';
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Konfigurasi Next.js Anda yang lain bisa ditambahkan di sini
};

export default withPWA(nextConfig);