const path = require('path');

module.exports = {
  entry: {
    app: './js/app.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: './js/[name].js',
    chunkFilename: './js/[name].chunk.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        mermaid: {
          test: /[\\/]node_modules[\\/]mermaid[\\/]/,
          name: 'mermaid',
          chunks: 'all',
          priority: 10,
        },
      },
    },
  },
  performance: {
    // 큰 asset들에 대한 경고 임계값 조정
    maxAssetSize: 1000000, // 1MB
    maxEntrypointSize: 1000000, // 1MB
    hints: 'warning',
  },
};
