const path = require('path');
const Fiber = require('fibers');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const SRC_ROOT = path.resolve(__dirname, 'src');
const DESTINATION = path.resolve(__dirname, 'dist');

module.exports = {
  context: SRC_ROOT,
  entry: {
    main: './main.ts'
  },
  output: {
    filename: '[name].bundle.js',
    path: DESTINATION
  },
  resolve: {
    extensions: ['.ts', '.js', '.scss', '.css'],
    modules: [SRC_ROOT, SRC_ROOT + '/styles', 'node_modules']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('dart-sass'),
              fiber: Fiber
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    })
  ]
};
