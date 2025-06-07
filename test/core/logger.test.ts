/**
 * Logger system tests for XJFN core
 */

import { LogLevel, LoggerFactory, Logger } from '../../src/core/logger';

// Mock console.log to capture output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  
  // Reset to default level
  LoggerFactory.setDefaultLevel(LogLevel.ERROR);
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('LogLevel enum', () => {
  test('should have correct string values', () => {
    expect(LogLevel.DEBUG).toBe('DEBUG');
    expect(LogLevel.INFO).toBe('INFO');
    expect(LogLevel.WARN).toBe('WARN');
    expect(LogLevel.ERROR).toBe('ERROR');
    expect(LogLevel.NONE).toBe('NONE');
  });
});

describe('LoggerFactory', () => {
  test('should have default level ERROR', () => {
    expect(LoggerFactory.getDefaultLevel()).toBe(LogLevel.ERROR);
  });
  
  test('should set and get default level', () => {
    LoggerFactory.setDefaultLevel(LogLevel.DEBUG);
    expect(LoggerFactory.getDefaultLevel()).toBe(LogLevel.DEBUG);
    
    LoggerFactory.setDefaultLevel(LogLevel.WARN);
    expect(LoggerFactory.getDefaultLevel()).toBe(LogLevel.WARN);
  });
  
  test('should create logger without context', () => {
    const logger = LoggerFactory.create();
    expect(logger).toBeInstanceOf(Logger);
  });
  
  test('should create logger with context', () => {
    const logger = LoggerFactory.create('TestContext');
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('Logger', () => {
  test('should log error messages at ERROR level', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create('TEST');
    
    logger.error('Test error message');
    
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('[TEST]');
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('Test error message');
  });
  
  test('should not log debug messages at ERROR level', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create('TEST');
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    
    expect(consoleOutput).toHaveLength(0);
  });
  
  test('should log all messages at DEBUG level', () => {
    LoggerFactory.setDefaultLevel(LogLevel.DEBUG);
    const logger = LoggerFactory.create('TEST');
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    
    expect(consoleOutput).toHaveLength(4);
    expect(consoleOutput[0]).toContain('[DEBUG]');
    expect(consoleOutput[1]).toContain('[INFO]');
    expect(consoleOutput[2]).toContain('[WARN]');
    expect(consoleOutput[3]).toContain('[ERROR]');
  });
  
  test('should respect log level hierarchy', () => {
    LoggerFactory.setDefaultLevel(LogLevel.WARN);
    const logger = LoggerFactory.create('TEST');
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    
    expect(consoleOutput).toHaveLength(2);
    expect(consoleOutput[0]).toContain('[WARN]');
    expect(consoleOutput[1]).toContain('[ERROR]');
  });
  
  test('should not log anything at NONE level', () => {
    LoggerFactory.setDefaultLevel(LogLevel.NONE);
    const logger = LoggerFactory.create('TEST');
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    
    expect(consoleOutput).toHaveLength(0);
  });
  
  test('should include timestamp in log messages', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create('TEST');
    
    logger.error('Test message');
    
    expect(consoleOutput[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });
  
  test('should work without context', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create();
    
    logger.error('Test message');
    
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('Test message');
    expect(consoleOutput[0]).not.toContain('[][]'); // No empty context brackets
  });
  
  test('should log structured data', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create('TEST');
    
    const data = { key: 'value', count: 42 };
    logger.error('Test message', data);
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
      data
    );
  });
  
  test('should handle undefined data', () => {
    LoggerFactory.setDefaultLevel(LogLevel.ERROR);
    const logger = LoggerFactory.create('TEST');
    
    logger.error('Test message', undefined);
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Test message')
    );
  });
});