/** @type {import('next').NextConfig} */
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig = {
  // Your existing Next.js config
  allowedDevOrigins: ['192.168.1.98']
};

export default withSerwist(nextConfig);
