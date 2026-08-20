/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/packages/**/*.spec.ts',
    '<rootDir>/apps/api/src/**/*.spec.ts',
    '<rootDir>/apps/cli/src/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@codexa/contracts$': '<rootDir>/packages/contracts/src/index.ts',
    '^@codexa/analysis$': '<rootDir>/packages/analysis/src/index.ts',
    '^@codexa/ai$': '<rootDir>/packages/ai/src/index.ts',
    '^@codexa/cli-core$': '<rootDir>/packages/cli-core/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.base.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverageFrom: ['packages/**/src/**/*.ts', 'apps/api/src/**/*.ts', 'apps/cli/src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.module\\.ts$',
    '\\.controller\\.ts$',
    '\\.d\\.ts$',
    '/src/index\\.ts$',
  ],
  coverageDirectory: 'coverage',
}
