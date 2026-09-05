/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Instagram CDN thumbnails are rendered with a plain <img> tag in the table,
    // so no remotePatterns are required. Kept here for future use.
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
};

export default nextConfig;
