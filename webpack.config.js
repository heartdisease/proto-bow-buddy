const path = require('path');

module.exports = {
  entry: './src/main.ts',
  devtool: 'inline-source-map',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.scss', '.css']
  },
  module: {
    rules: [
      {
        // https://webpack.js.org/guides/typescript/
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        // from https://medium.com/a-beginners-guide-for-webpack-2/using-sass-9f52e447c5ae
        test: /\.scss$/,
        use: [
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      }
    ]
  }
};
