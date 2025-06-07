/**
 * Jest setup file for XJFN tests
 * 
 * This file runs before each test suite and sets up the testing environment
 */

// Global test timeout (10 seconds for integration tests)
jest.setTimeout(10000);

// Mock console methods for cleaner test output (optional)
const originalConsole = global.console;

beforeAll(() => {
  // Optionally suppress console output during tests
  // Uncomment the following lines if tests are too verbose
  /*
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  */
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Set up any global test utilities or mocks here
global.testUtils = {
  /**
   * Helper to create a test XNode structure
   */
  createTestTree: () => {
    // This will be populated as we build more test utilities
    return null;
  }
};

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, but log the error
});

// Set default log level for tests to reduce noise
import { LoggerFactory, LogLevel } from '../src/core/logger';
LoggerFactory.setDefaultLevel(LogLevel.ERROR);

export {};