/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Ignore React Native specific modules that aren't needed for web
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    // Suppress warnings for optional dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
    ];
    
    // Exclude server directory
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/server/**', '**/.git']
    };
    
    return config;
  },
};

module.exports = nextConfig;
