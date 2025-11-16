const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Metro config
const config = getDefaultConfig(projectRoot);

// Make Metro watch shared packages
config.watchFolders = [
    path.resolve(monorepoRoot, "packages/shared"),
];

// Make Metro resolve node_modules from root
config.resolver.nodeModulesPaths = [
    path.resolve(monorepoRoot, "node_modules"),
    path.resolve(projectRoot, "node_modules"),
];

// Allow .ts/.tsx outside of the app folder
config.resolver.sourceExts.push("ts", "tsx");

module.exports = config;
