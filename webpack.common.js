const path = require('path');
const CopyPlugin = require('webpack-copy-plugin');

module.exports = {
  entry: './src/ts/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
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
  plugins: [
    new CopyPlugin([])
  ],
  devtool: 'source-map',
};
