const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyPlugin = require('copy-webpack-plugin');
const { execSync } = require('child_process');

// 커밋 해시(짧은 형태) 또는 외부에서 주입된 BUILD_VERSION 사용
let version = 'dev';
try {
  version = process.env.BUILD_VERSION || execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // git 없는 환경 대비 기본값 유지
}

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    ...common.optimization,
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'resume.html',
          to: 'resume.html',
          transform(content) {
            return content.toString().replace(/\{\{VERSION\}\}/g, version);
          },
        },
        {
          from: 'portfolio.html',
          to: 'portfolio.html',
          transform(content) {
            return content.toString().replace(/\{\{VERSION\}\}/g, version);
          },
        },
        {
          from: 'intro-cards.html',
          to: 'intro-cards.html',
          transform(content) {
            return content.toString().replace(/\{\{VERSION\}\}/g, version);
          },
        },
        {
          from: 'index.html',
          to: 'index.html',
          transform(content) {
            return content.toString().replace(/\{\{VERSION\}\}/g, version);
          },
        },
        { from: 'img', to: 'img' },
        { from: 'css', to: 'css' },
        // Copy vendor files except mermaid (will be bundled separately)
        { 
          from: 'js/vendor',
          to: 'js/vendor',
          globOptions: {
            ignore: ['**/mermaid.min.js']
          }
        },
        { from: 'icon.svg', to: 'icon.svg' },
        { from: 'favicon.ico', to: 'favicon.ico' },
        { from: 'favicon.svg', to: 'favicon.svg' },
        { from: 'robots.txt', to: 'robots.txt' },
        { from: 'icon.png', to: 'icon.png' },
        { from: '404.html', to: '404.html' },
        { from: 'site.webmanifest', to: 'site.webmanifest' },
        // copy only necessary font weights for offline use (400, 700)
        { 
          from: 'node_modules/@fontsource/noto-sans-kr/files', 
          to: 'fonts/noto-sans-kr',
          globOptions: {
            ignore: [
              '**/noto-sans-kr-korean-100-normal.*',
              '**/noto-sans-kr-korean-200-normal.*', 
              '**/noto-sans-kr-korean-300-normal.*',
              '**/noto-sans-kr-korean-500-normal.*',
              '**/noto-sans-kr-korean-600-normal.*',
              '**/noto-sans-kr-korean-800-normal.*',
              '**/noto-sans-kr-korean-900-normal.*'
            ]
          }
        },
      ],
    }),
  ],
});
