const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
  target: 'node',
  mode: 'production',
  externals: [nodeExternals()],
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: __dirname,
    filename: 'index.js',
  },
  devtool: 'source-map',
  plugins: [],
  module: {
    rules: [
      {
        test: /\.js$/i,
        exclude: /(node_modules|bower_components)/,
        use: 'babel-loader',
      },
    ],
  },
}
