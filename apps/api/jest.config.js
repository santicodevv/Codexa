/** @type {import('jest').Config} */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@codexa/contracts$': '<rootDir>/../packages/contracts/src/index.ts',
    '^@codexa/analysis$': '<rootDir>/../packages/analysis/src/index.ts',
    '^@codexa/ai$': '<rootDir>/../packages/ai/src/index.ts',
    '^@codexa/cli-core$': '<rootDir>/../packages/cli-core/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.module\\.ts$',
    '\\.controller\\.ts$',
    '\\.d\\.ts$',
  ],
  coverageDirectory: 'coverage',
}
