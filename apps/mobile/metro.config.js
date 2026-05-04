const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(workspaceRoot, "node_modules"),
    ],
    disableHierarchicalLookup: true,
    unstable_enableSymlinks: true,
    extraNodeModules: {
      react: path.resolve(workspaceRoot, "node_modules/react"),
      "react-native": path.resolve(workspaceRoot, "node_modules/react-native"),
      scheduler: path.resolve(workspaceRoot, "node_modules/scheduler"),
      "react-is": path.resolve(workspaceRoot, "node_modules/react-is"),
    },
  },
  watchFolders: [workspaceRoot],
};

module.exports = mergeConfig(defaultConfig, config);
