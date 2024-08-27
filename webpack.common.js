const CreateFileWebpack = require('create-file-webpack');
const npmPackage = require('./package.json');
const path = require('path');

module.exports = {
  entry: './src/ts/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.build.json'
          }
        },
        exclude: /node_modules/,
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
    filename: 'bitmovin-player-analytics-conviva.js',
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
  plugins: [
    new CreateFileWebpack({
      // path to folder in which the file will be created
      path: './dist',
      // file name
      fileName: 'bitmovin-player-analytics-conviva.d.ts',
      // content of the file
      content: 'export * from \'./lib/index\';'
    }),
  ],
  externals: {
    '@convivainc/conviva-js-coresdk': {
      commonjs: '@convivainc/conviva-js-coresdk',
      commonjs2: '@convivainc/conviva-js-coresdk',
      amd: '@convivainc/conviva-js-coresdk',
      root: ['Conviva']
    },
    'bitmovin-player': {
      commonjs: 'bitmovin-player',
      commonjs2: 'bitmovin-player',
      amd: 'bitmovin-player',
      root: ['bitmovin', 'player']
    }
  }
};
