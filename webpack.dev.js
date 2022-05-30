const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    host: 'localhost',
    publicPath: '/dist/',
    contentBase: path.resolve(__dirname, 'example'),
    watchContentBase: true
  },
  optimization: {
    nodeEnv: 'development',
    minimize: false
  }
});
