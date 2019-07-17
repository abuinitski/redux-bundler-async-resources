const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
  mode: 'production',
  target: 'node',
  output: {
    library: 'redux-bundler-async-resources',
    libraryTarget: 'umd',
    path: __dirname,
    filename: 'index.js',
  },
  externals: [nodeExternals()],
  entry: path.resolve(__dirname, './src/index.js'),
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
