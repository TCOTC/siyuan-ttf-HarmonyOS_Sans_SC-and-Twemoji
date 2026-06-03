const path = require("path");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = (env, argv) => {
    const production = argv.mode === "production";
    const plugins = [
        new MiniCssExtractPlugin({
            filename: production ? "dist/index.css" : "index.css",
        }),
    ];
    if (production) {
        plugins.push(
            new CopyPlugin({
                patterns: [
                    {from: "preview.png", to: "./dist/"},
                    {from: "icon.png", to: "./dist/"},
                    {from: "README*.md", to: "./dist/"},
                    {from: "plugin.json", to: "./dist/"},
                    {from: "src/i18n/", to: "./dist/i18n/"},
                    {from: "HarmonyOS_Sans", to: "./dist/HarmonyOS_Sans"},
                    {from: "Twemoji", to: "./dist/Twemoji"},
                ],
            }),
        );
        plugins.push(
            new ZipPlugin({
                filename: "package.zip",
                algorithm: "gzip",
                include: [/dist/],
                pathMapper: (assetPath) => {
                    return assetPath.replace("dist/", "");
                },
            }),
        );
    } else {
        plugins.push(
            new CopyPlugin({
                patterns: [
                    {from: "src/i18n/", to: "./i18n/"},
                    {from: "HarmonyOS_Sans", to: "HarmonyOS_Sans"},
                    {from: "Twemoji", to: "Twemoji"},
                ],
            }),
        );
    }
    return {
        mode: argv.mode || "development",
        watch: !production,
        devtool: production ? false : "eval-source-map",
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname),
            libraryTarget: "commonjs2",
            library: {
                type: "commonjs2",
            },
        },
        externals: {
            siyuan: "siyuan",
        },
        entry: {
            [production ? "dist/index" : "index"]: "./src/index.ts",
        },
        optimization: {
            minimize: production,
            minimizer: [
                new EsbuildPlugin(),
            ],
        },
        resolve: {
            extensions: [".ts", ".scss", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        {
                            loader: "esbuild-loader",
                            options: {
                                target: "es6",
                            },
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                url: false,
                            },
                        },
                        {
                            loader: "sass-loader",
                        },
                    ],
                },
            ],
        },
        plugins,
    };
};
