const npmPackage = require('./package.json');
const path = require('path');

module.exports = {
  entry: './src/ts/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.tsx?$/,
        loader: 'string-replace-loader',
        options: {
          search: '{{VERSION}}',
          replace: npmPackage.version,
          flags: 'g'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'bitmovinplayer-analytics-conviva.js',
    umdNamedDefine: true,
    path: path.resolve(__dirname, 'dist'),
    library: {
      root: ['bitmovin', 'player', 'analytics'],
      amd: 'bitmovin-player-analytics-conviva',
      commonjs: 'bitmovin-player-analytics-conviva'
    },
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
};
