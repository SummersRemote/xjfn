/**
 * Simplified error handling
 */

import { LoggerFactory } from "./logger";
const log = LoggerFactory.create();

// --- Simplified Error Types ---

/**
 * Base XJX error class that other errors extend
 */
export class XJXError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'XJXError';
    Object.setPrototypeOf(this, XJXError.prototype);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends XJXError {
  constructor(message: string, details?: any) {
    super(message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for parsing or serialization failures
 */
export class ProcessingError extends XJXError {
  constructor(message: string, public source?: any) {
    super(message, { source });
    this.name = 'ProcessingError';
    Object.setPrototypeOf(this, ProcessingError.prototype);
  }
}


/**
 * Validate a condition and throw a ValidationError if it fails.
 * Only use at API boundaries, not for internal validation.
 * 
 * @param condition Condition to check
 * @param message Error message if condition fails
 * @param details Optional details to include in the error
 * @throws ValidationError if condition is false
 */
export function validate(
  condition: boolean,
  message: string,
  details?: any
): void {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}

/**
 * Handle an error with consistent logging and optional fallback value
 * 
 * @param err The caught error
 * @param context String describing where the error occurred
 * @param options Additional options for error handling
 * @returns A fallback value if provided, otherwise throws the error
 */
export function handleError<T>(
  err: unknown, 
  context: string, 
  options: {
    fallback?: T;
    data?: Record<string, any>;
  } = {}
): T {
  // Log the error
  if (err instanceof Error) {
    log.error(`Error in ${context}`, {
      error: err,
      ...(options.data || {})
    });
  } else {
    log.error(`Error in ${context}`, {
      error: String(err),
      ...(options.data || {})
    });
  }
  
  // Return fallback or throw
  if (options.fallback !== undefined) {
    return options.fallback;
  }
  
  // Just throw the original error
  if (err instanceof Error) {
    throw err;
  }
  
  // Convert to Error if it's not already
  throw new Error(`${context}: ${String(err)}`);
}