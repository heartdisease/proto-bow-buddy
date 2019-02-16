const path = require('path');
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
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
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
