/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\.ts$': ['babel-jest', require('../../babel.node.config.js')] },
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageThreshold: { global: { lines: 80, branches: 80, functions: 80, statements: 80 } },
};
