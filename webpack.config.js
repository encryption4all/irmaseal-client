const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const dist = path.resolve(__dirname, 'dist')

module.exports = {
    mode: 'development',
    entry: {
        index: './index.js',
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
    devServer: {
        contentBase: dist,
    },
    plugins: [new CleanWebpackPlugin({ verbose: true })],
}
