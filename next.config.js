/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['maplibre-gl'],
  webpack: (config) => {
    // Prevent maplibre-gl from being split into multiple chunks, which causes
    // "ReferenceError: _n is not defined" at runtime due to broken inter-chunk refs.
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
          maplibre: {
            test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/,
            name: 'maplibre-gl',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
        },
      },
    };
    return config;
  },
};

module.exports = nextConfig;
