const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const dist = path.resolve(__dirname, 'dist')
const webpackMode = 'development'

var libConfig = {
  name: 'lib',
  mode: webpackMode,
  entry: {
    index: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  output: {
    path: dist,
    filename: 'irmaseal-client.js',
    library: 'irmaseal-client',
    libraryTarget: 'umd',
    publicPath: '',
  },
  experiments: {
    syncWebAssembly: true,
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*', '!example_**'],
    }),
  ],
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules')],
  },
}

var exampleConfig = {
  name: 'examples',
  mode: webpackMode,
  entry: {
    string: './examples/string.js',
    file: './examples/file.js',
  },
  output: {
    path: dist,
    filename: 'example_[name].js',
  },
  experiments: {
    syncWebAssembly: true,
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['example_**'],
    }),
    new HtmlWebpackPlugin({
      filename: 'example_string.html',
      chunks: ['string'],
    }),
    new HtmlWebpackPlugin({
      filename: 'example_file.html',
      template: './examples/file.html',
      chunks: ['file'],
    }),
  ],
}

module.exports = [libConfig, exampleConfig]
