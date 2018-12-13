const path = require('path');

module.exports = {
  entry: './src/ts/bundle.ts',
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
      root: 'ConvivaAnalytics',
      amd: 'bitmovinplayer-analytics-conviva',
      commonjs: 'bitmovinplayer-analytics-conviva'
    },
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
};
