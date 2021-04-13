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
}

var exampleConfig = {
  name: 'browser-example',
  mode: webpackMode,
  entry: './examples/browser.js',
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
    new HtmlWebpackPlugin({ filename: 'example_index.html' }),
  ],
}

module.exports = [libConfig, exampleConfig]
