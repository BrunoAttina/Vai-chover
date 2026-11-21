const babel = ['babel-jest', require('../babel.node.config.js')];
// jose (usado pelo firebase-admin) é publicado só como ESM: transpilado para CommonJS nos testes.
const transform = { '\\.ts$': babel, '[\\\\/]node_modules[\\\\/]jose[\\\\/].+\\.js$': babel };
const base = {
  testEnvironment: 'node',
  transform,
  transformIgnorePatterns: ['[\\\\/]node_modules[\\\\/](?!jose[\\\\/])'],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    { ...base, displayName: 'unit', roots: ['<rootDir>/tests/unit'] },
    { ...base, displayName: 'contract', roots: ['<rootDir>/tests/contract'] },
    {
      ...base,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      setupFiles: ['<rootDir>/tests/integration/setup-env.ts'],
    },
    { ...base, displayName: 'rules', roots: ['<rootDir>/tests/rules'] },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/handlers.ts', '!src/data/**'],
  coverageThreshold: { global: { lines: 80, branches: 80, functions: 80, statements: 80 } },
};
