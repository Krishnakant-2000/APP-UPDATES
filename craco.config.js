const CompressionPlugin = require('compression-webpack-plugin');
// const CssMinimizerPlugin = require('css-minimizer-webpack-plugin'); // Disabled due to CSS parsing issues
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {

  webpack: {
    configure: (webpackConfig, { env }) => {
      // Performance optimizations for production
      if (env === 'production') {
        // Remove CSS minimizer to avoid parsing errors
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.filter(
          (plugin) => plugin.constructor.name !== 'CssMinimizerPlugin'
        );
        
        console.log('CSS minimization disabled - fix CSS syntax issues first');

        // Add compression
        webpackConfig.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
          })
        );

        // Bundle analysis (only when ANALYZE=true)
        if (process.env.ANALYZE) {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
            })
          );
        }

        // Optimize chunks
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              priority: 20,
              chunks: 'all',
            },
            three: {
              test: /[\\/]node_modules[\\/]three[\\/]/,
              name: 'three',
              priority: 20,
              chunks: 'all',
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
            },
          },
        };

        // Tree shaking optimization
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;
      }

      return webpackConfig;
    },
  },
  devServer: {
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
    },
  },
};
