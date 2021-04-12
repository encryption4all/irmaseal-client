const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin')

const dist = path.resolve(__dirname, 'dist')
const crate = path.resolve(__dirname, 'crate')
const crateOut = path.resolve(crate, 'pkg')

const webpackMode = 'development'
const wasmpackMode = 'production'

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
    new WasmPackPlugin({
      crateDirectory: crate,
      outDir: crateOut,
      outName: 'index',
      forceMode: wasmpackMode,
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
