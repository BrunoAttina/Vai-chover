// Metro em monorepo (npm workspaces): observa a raiz para enxergar packages/shared e
// garante uma única cópia de React (o app fixa react@19.3.0 em app/node_modules).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const SINGLETONS = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  '@vai-chover/shared': path.resolve(workspaceRoot, 'packages/shared'),
};

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [name, target] of Object.entries(SINGLETONS)) {
    if (moduleName === name || moduleName.startsWith(`${name}/`)) {
      const redirected = target + moduleName.slice(name.length);
      return context.resolveRequest(context, redirected, platform);
    }
  }
  return defaultResolve
    ? defaultResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
