const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

const dist = path.resolve(__dirname, 'dist')
const webpackMode = 'development'

module.exports = {
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
        asyncWebAssembly: true,
        topLevelAwait: true,
    },
    resolve: {
        fallback: {
            https: require.resolve('https-browserify'),
            http: require.resolve('stream-http'),
            url: require.resolve('url/'),
            util: require.resolve('util/'),
            events: false,
        },
        modules: [path.resolve(__dirname, 'node_modules')],
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'string.html',
            chunks: ['string'],
        }),
        new HtmlWebpackPlugin({
            filename: 'file.html',
            template: './examples/file.html',
            chunks: ['file'],
        }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './index.html',
        }),        
    ],
}
