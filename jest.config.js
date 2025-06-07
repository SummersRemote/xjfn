// jest.config.mjs
export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts'],
  // extensionsToTreatAsEsm: ['.js'],
  "moduleNameMapper": {
    "/^(\.{1,2}\/.*)\.js$/": "$1"
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['./tests/setup.js']
};