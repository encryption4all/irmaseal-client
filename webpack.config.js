const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "production",
  entry: {
    index: "./index.js",
  },
  output: {
    path: dist,
    filename: "[name].js",
  },
  experiments: {
    asyncWebAssembly: true,
  },
  devServer: {
    contentBase: dist,
  },
  plugins: [
    new CopyPlugin({ patterns: [{ from: "static"}] }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "."),
      extraArgs: "--no-typescript",
    }),
  ],
};
