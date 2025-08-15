const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'resume.html', to: 'resume.html' },
        { from: 'portfolio.html', to: 'portfolio.html' },
        { from: 'intro-cards.html', to: 'intro-cards.html' },
        { from: 'index.html', to: 'index.html' },
        { from: 'img', to: 'img' },
        { from: 'css', to: 'css' },
        { from: 'js/vendor', to: 'js/vendor' },
        { from: 'icon.svg', to: 'icon.svg' },
        { from: 'favicon.ico', to: 'favicon.ico' },
        { from: 'favicon.svg', to: 'favicon.svg' },
        { from: 'robots.txt', to: 'robots.txt' },
        { from: 'icon.png', to: 'icon.png' },
        { from: '404.html', to: '404.html' },
        { from: 'site.webmanifest', to: 'site.webmanifest' },
        // copy local font files for offline use
        { from: 'node_modules/@fontsource/noto-sans-kr/files', to: 'fonts/noto-sans-kr' },
      ],
    }),
  ],
});
