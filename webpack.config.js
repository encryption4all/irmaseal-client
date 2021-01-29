const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "development",
  entry: {
    index: "./index.js",
  },
  output: {
    path: dist,
    filename: "irmaseal.js",
    library: "irmaseal",
    libraryTarget: "umd",
    publicPath: "",
  },
  experiments: {
    syncWebAssembly: true
  },
  devServer: {
    contentBase: dist,
  },
  plugins: [
    new CopyPlugin({ patterns: [{ from: "static" }] }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "."),
      extraArgs: "--no-typescript",
      forceMode: "production"
    }),
  ],
};
