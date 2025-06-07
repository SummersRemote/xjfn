/**
 * Error handling tests for XJFN core
 */

import { 
  XJFNError, 
  ValidationError, 
  ProcessingError,
  validate,
  handleError 
} from '../../src/core/error';

describe('XJFNError', () => {
  test('should create base error with message', () => {
    const error = new XJFNError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(XJFNError);
    expect(error.name).toBe('XJFNError');
    expect(error.message).toBe('Test error');
    expect(error.details).toBeUndefined();
  });
  
  test('should create error with details', () => {
    const details = { code: 'TEST_ERROR', data: 'some data' };
    const error = new XJFNError('Test error', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('ValidationError', () => {
  test('should create validation error', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(XJFNError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
  });
  
  test('should create validation error with details', () => {
    const details = { field: 'name', value: null };
    const error = new ValidationError('Field cannot be null', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('ProcessingError', () => {
  test('should create processing error', () => {
    const error = new ProcessingError('Parse failed');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(XJFNError);
    expect(error).toBeInstanceOf(ProcessingError);
    expect(error.name).toBe('ProcessingError');
    expect(error.message).toBe('Parse failed');
  });
  
  test('should create processing error with source', () => {
    const source = '<invalid>xml';
    const error = new ProcessingError('XML parse failed', source);
    
    expect(error.source).toBe(source);
    expect(error.details).toEqual({ source });
  });
});

describe('validate function', () => {
  test('should pass for true condition', () => {
    expect(() => validate(true, 'Should not throw')).not.toThrow();
  });
  
  test('should throw ValidationError for false condition', () => {
    expect(() => validate(false, 'Test validation failed')).toThrow(ValidationError);
    expect(() => validate(false, 'Test validation failed')).toThrow('Test validation failed');
  });
  
  test('should include details in ValidationError', () => {
    const details = { field: 'age', min: 18 };
    
    try {
      validate(false, 'Age validation failed', details);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual(details);
    }
  });
});

describe('handleError function', () => {
  test('should return fallback value when provided', () => {
    const result = handleError(new Error('Test error'), 'test context', { fallback: 'default' });
    expect(result).toBe('default');
  });
  
  test('should re-throw Error instances when no fallback', () => {
    const originalError = new Error('Original error');
    
    expect(() => handleError(originalError, 'test context')).toThrow(originalError);
  });
  
  test('should wrap non-Error values in ProcessingError', () => {
    expect(() => handleError('string error', 'test context')).toThrow(ProcessingError);
    expect(() => handleError('string error', 'test context')).toThrow('test context: string error');
  });
  
  test('should wrap non-Error with data', () => {
    const data = { extra: 'info' };
    
    try {
      handleError('string error', 'test context', { data });
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).details).toEqual(data);
    }
  });
  
  test('should handle null/undefined errors', () => {
    expect(() => handleError(null, 'test context')).toThrow('test context: null');
    expect(() => handleError(undefined, 'test context')).toThrow('test context: undefined');
  });
});