const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const SRC_ROOT = path.resolve(__dirname, 'src');
const DESTINATION = path.resolve(__dirname, 'dist');

const devMode = process.env.NODE_ENV !== 'production';

module.exports = {
  context: SRC_ROOT,
  entry: {
    main: './main.ts'
  },
  output: {
    filename: '[name].bundle.js',
    path: DESTINATION
    //publicPath: 'dist'
  },
  resolve: {
    extensions: ['.d.ts', '.ts', '.js', '.scss', '.css'],
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
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: devMode ? '[name].css' : '[name].[hash].css',
      chunkFilename: devMode ? '[id].css' : '[id].[hash].css'
    })
  ],
  devtool: 'source-map',
  devServer: {}
};
