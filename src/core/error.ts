/**
 * Error handling system for XJFN - Simple hierarchy with fail-fast principle
 * 
 * Design Intent:
 * - Clear error hierarchy for different failure types
 * - Fail-fast with descriptive error messages
 * - Optional error details/context for debugging
 * - Consistent error handling patterns
 */

/**
 * Base XJFN error class that other errors extend
 */
export class XJFNError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'XJFNError';
    Object.setPrototypeOf(this, XJFNError.prototype);
  }
}

/**
 * Error for validation failures at API boundaries
 * 
 * Used when:
 * - Invalid input parameters
 * - Missing required data
 * - Type validation failures
 * - Configuration validation errors
 */
export class ValidationError extends XJFNError {
  constructor(message: string, details?: any) {
    super(message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for parsing or serialization failures
 * 
 * Used when:
 * - XML/JSON parsing fails
 * - Format conversion errors
 * - Serialization/deserialization issues
 * - Adapter execution failures
 */
export class ProcessingError extends XJFNError {
  constructor(message: string, public source?: any) {
    super(message, { source });
    this.name = 'ProcessingError';
    Object.setPrototypeOf(this, ProcessingError.prototype);
  }
}

/**
 * Validate a condition and throw a ValidationError if it fails
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
  // Determine error message
  const errorMessage = err instanceof Error ? err.message : String(err);
  
  // Return fallback or throw
  if (options.fallback !== undefined) {
    return options.fallback;
  }
  
  // Re-throw the original error or wrap it
  if (err instanceof Error) {
    throw err;
  }
  
  // Convert to ProcessingError if it's not already an Error
  // Create ProcessingError with original error as source, then set details directly
  const processingError = new ProcessingError(`${context}: ${errorMessage}`, err);
  if (options.data) {
    processingError.details = options.data;
  }
  throw processingError;
}