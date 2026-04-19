

const nextConfig = {
  output: "standalone",
  images: {
    domains: ["localhost", "res.cloudinary.com"],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
