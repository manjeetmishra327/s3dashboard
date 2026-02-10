/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    RESUME_COLLECTION: process.env.RESUME_COLLECTION,
    JWT_SECRET: process.env.JWT_SECRET,
  },
}

module.exports = nextConfig
