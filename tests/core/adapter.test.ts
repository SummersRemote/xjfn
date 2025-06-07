/**
 * Pipeline context tests for XJFN core
 */

import { PipelineContext } from '../../src/core/context';
import { Configuration, DEFAULT_CONFIG } from '../../src/core/config';
import { ValidationError } from '../../src/core/error';
import { LoggerFactory, LogLevel } from '../../src/core/logger';
import { createField, createRecord, addChild } from '../../src/core/xnode';

// Mock console.log to capture log output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  LoggerFactory.setDefaultLevel(LogLevel.DEBUG);
});

afterEach(() => {
  console.log = originalConsoleLog;
  LoggerFactory.setDefaultLevel(LogLevel.ERROR);
});

describe('PipelineContext', () => {
  test('should initialize with configuration and logger', () => {
    const config: Configuration = { ...DEFAULT_CONFIG };
    const context = new PipelineContext(config);
    
    expect(context.config).toBe(config);
    expect(context.logger).toBeDefined();
    expect(context.metadata).toEqual({});
  });
  
  test('should create logger with XJFN context', () => {
    const context = new PipelineContext(DEFAULT_CONFIG);
    
    context.logger.info('Test message');
    
    expect(consoleOutput[0]).toContain('[XJFN]');
    expect(consoleOutput[0]).toContain('Test message');
  });
});

describe('Node operations', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext(DEFAULT_CONFIG);
  });
  
  test('cloneNode should shallow clone by default', () => {
    const parent = createRecord('parent');
    const child = createField('child', 'value');
    addChild(parent, child);
    
    const clone = context.cloneNode(parent);
    
    expect(clone.name).toBe('parent');
    expect(clone.type).toBe(parent.type);
    expect(clone.children).toBeUndefined();
    expect(clone.parent).toBeUndefined();
  });
  
  test('cloneNode should deep clone when requested', () => {
    const parent = createRecord('parent');
    const child = createField('child', 'value');
    addChild(parent, child);
    
    const clone = context.cloneNode(parent, true);
    
    expect(clone.children).toHaveLength(1);
    expect(clone.children![0].name).toBe('child');
    expect(clone.children![0].parent).toBe(clone);
    expect(clone.children![0]).not.toBe(child);
  });
});

describe('Validation', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext(DEFAULT_CONFIG);
  });
  
  test('validateInput should pass for true condition', () => {
    expect(() => context.validateInput(true, 'Should not throw')).not.toThrow();
  });
  
  test('validateInput should throw ValidationError for false condition', () => {
    expect(() => context.validateInput(false, 'Test validation failed')).toThrow(ValidationError);
    expect(() => context.validateInput(false, 'Test validation failed')).toThrow('Test validation failed');
  });
  
  test('validateInput should log error before throwing', () => {
    try {
      context.validateInput(false, 'Test validation failed');
    } catch (e) {
      // Expected
    }
    
    expect(consoleOutput.some(log => log.includes('[ERROR]') && log.includes('Validation failed: Test validation failed'))).toBe(true);
  });
});

describe('Configuration management', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext({ ...DEFAULT_CONFIG });
  });
  
  test('mergeConfig should update configuration', () => {
    const updates = {
      preserveComments: false,
      fragmentRoot: 'custom'
    };
    
    context.mergeConfig(updates);
    
    expect(context.config.preserveComments).toBe(false);
    expect(context.config.fragmentRoot).toBe('custom');
    expect(context.config.preserveInstructions).toBe(true); // Original preserved
  });
  
  test('mergeConfig should log configuration updates', () => {
    const updates = { preserveComments: false };
    
    context.mergeConfig(updates);
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Configuration updated')
    )).toBe(true);
  });
});

describe('Namespaced metadata management', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext(DEFAULT_CONFIG);
  });
  
  test('setMetadata should store metadata in namespace', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'elementCount', 42);
    context.setMetadata('json', 'originalType', 'array');
    
    expect(context.metadata.xml).toEqual({
      hasNamespaces: true,
      elementCount: 42
    });
    expect(context.metadata.json).toEqual({
      originalType: 'array'
    });
  });
  
  test('setMetadata should log metadata operations', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Metadata set: xml.hasNamespaces')
    )).toBe(true);
  });
  
  test('getMetadata should return specific key value', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'elementCount', 42);
    
    expect(context.getMetadata('xml', 'hasNamespaces')).toBe(true);
    expect(context.getMetadata('xml', 'elementCount')).toBe(42);
    expect(context.getMetadata('xml', 'nonexistent')).toBeUndefined();
  });
  
  test('getMetadata should return entire namespace when no key', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'elementCount', 42);
    
    expect(context.getMetadata('xml')).toEqual({
      hasNamespaces: true,
      elementCount: 42
    });
  });
  
  test('getMetadata should return empty object for nonexistent namespace', () => {
    expect(context.getMetadata('nonexistent')).toEqual({});
  });
  
  test('hasMetadata should check specific key existence', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    
    expect(context.hasMetadata('xml', 'hasNamespaces')).toBe(true);
    expect(context.hasMetadata('xml', 'nonexistent')).toBe(false);
    expect(context.hasMetadata('nonexistent', 'key')).toBe(false);
  });
  
  test('hasMetadata should check namespace existence when no key', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    
    expect(context.hasMetadata('xml')).toBe(true);
    expect(context.hasMetadata('nonexistent')).toBe(false);
  });
  
  test('hasMetadata should return false for empty namespace', () => {
    context.metadata.xml = {}; // Empty namespace
    
    expect(context.hasMetadata('xml')).toBe(false);
  });
  
  test('clearMetadata should clear specific key', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'elementCount', 42);
    
    context.clearMetadata('xml', 'hasNamespaces');
    
    expect(context.hasMetadata('xml', 'hasNamespaces')).toBe(false);
    expect(context.hasMetadata('xml', 'elementCount')).toBe(true);
  });
  
  test('clearMetadata should clear entire namespace when no key', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'elementCount', 42);
    
    context.clearMetadata('xml');
    
    expect(context.hasMetadata('xml')).toBe(false);
  });
  
  test('clearMetadata should log clear operations', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    
    context.clearMetadata('xml', 'hasNamespaces');
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Cleared metadata: xml.hasNamespaces')
    )).toBe(true);
  });
  
  test('clearMetadata should log namespace clear operations', () => {
    context.setMetadata('xml', 'hasNamespaces', true);
    
    context.clearMetadata('xml');
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Cleared all metadata for namespace: xml')
    )).toBe(true);
  });
  
  test('clearMetadata should handle nonexistent namespace/key gracefully', () => {
    expect(() => context.clearMetadata('nonexistent')).not.toThrow();
    expect(() => context.clearMetadata('nonexistent', 'key')).not.toThrow();
  });
});

describe('Logging helpers', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext(DEFAULT_CONFIG);
  });
  
  test('logOperation should log operation with details', () => {
    const details = { inputType: 'string', elementCount: 5 };
    
    context.logOperation('xml-parse', details);
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Operation: xml-parse')
    )).toBe(true);
  });
  
  test('logOperation should log operation without details', () => {
    context.logOperation('xml-parse');
    
    expect(consoleOutput.some(log => 
      log.includes('[DEBUG]') && 
      log.includes('Operation: xml-parse')
    )).toBe(true);
  });
  
  test('logError should log error for operation', () => {
    const error = new Error('Test error');
    
    context.logError('xml-parse', error);
    
    expect(consoleOutput.some(log => 
      log.includes('[ERROR]') && 
      log.includes('Error in xml-parse:')
    )).toBe(true);
  });
});

describe('Metadata use cases', () => {
  let context: PipelineContext;
  
  beforeEach(() => {
    context = new PipelineContext(DEFAULT_CONFIG);
  });
  
  test('should support XML adapter metadata pattern', () => {
    // Simulate XML adapter setting metadata
    context.setMetadata('xml', 'hasDeclaration', true);
    context.setMetadata('xml', 'hasNamespaces', true);
    context.setMetadata('xml', 'originalLength', 1234);
    context.setMetadata('xml', 'elementCount', 15);
    
    // Simulate another adapter reading XML metadata
    const hasNamespaces = context.getMetadata('xml', 'hasNamespaces');
    const elementCount = context.getMetadata('xml', 'elementCount');
    
    expect(hasNamespaces).toBe(true);
    expect(elementCount).toBe(15);
  });
  
  test('should support JSON adapter metadata pattern', () => {
    // Simulate JSON adapter setting metadata
    context.setMetadata('json', 'originalType', 'array');
    context.setMetadata('json', 'hasAttributes', false);
    context.setMetadata('json', 'itemCount', 8);
    
    // Simulate processing based on metadata
    const originalType = context.getMetadata('json', 'originalType');
    
    if (originalType === 'array') {
      // Process as array
      expect(context.getMetadata('json', 'itemCount')).toBe(8);
    }
  });
  
  test('should support cross-adapter metadata coordination', () => {
    // XML adapter stores source info
    context.setMetadata('xml', 'preserveNamespaces', true);
    context.setMetadata('xml', 'hasComments', true);
    
    // XNode adapter reads XML metadata for serialization decisions
    const preserveNamespaces = context.getMetadata('xml', 'preserveNamespaces');
    const hasComments = context.getMetadata('xml', 'hasComments');
    
    // XNode adapter sets its own metadata based on source
    context.setMetadata('xnode', 'includeSourceInfo', preserveNamespaces || hasComments);
    context.setMetadata('xnode', 'serializedAt', new Date().toISOString());
    
    expect(context.getMetadata('xnode', 'includeSourceInfo')).toBe(true);
    expect(context.hasMetadata('xnode', 'serializedAt')).toBe(true);
  });
});