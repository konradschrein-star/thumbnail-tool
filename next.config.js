/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PORT: process.env.PORT || '3072',
  },
};

module.exports = nextConfig;
