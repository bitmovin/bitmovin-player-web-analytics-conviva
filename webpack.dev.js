const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    host: 'localhost',
    devMiddleware: {
      publicPath: '/dist/',
    },
    static: {
      directory: path.resolve(__dirname, 'example'),
      watch: true,
    },
  },
  optimization: {
    nodeEnv: 'development',
    minimize: false,
  },
});
