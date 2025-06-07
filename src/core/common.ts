/**
 * Common utility functions used across the library
 */

/**
 * Deep clone an object using JSON serialization
 * @param obj Object to clone
 * @returns Deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge two objects
 * @param target Target object
 * @param source Source object to merge into target
 * @returns New object with merged properties (doesn't modify inputs)
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  if (!source || typeof source !== 'object' || source === null) {
    return deepClone(target);
  }

  if (!target || typeof target !== 'object' || target === null) {
    return deepClone(source) as T;
  }

  const result = deepClone(target);

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key as keyof Partial<T>];
    const targetValue = result[key as keyof T];

    // If both values are objects, recursively merge them
    if (
      sourceValue !== null &&
      targetValue !== null &&
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(sourceValue) &&
      !Array.isArray(targetValue)
    ) {
      (result[key as keyof T] as any) = deepMerge(
        targetValue as Record<string, any>,
        sourceValue as Record<string, any>
      );
    } else {
      // Otherwise just replace the value
      (result[key as keyof T] as any) = deepClone(sourceValue);
    }
  });

  return result;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array or empty object)
 * @param value Value to check
 * @returns true if the value is empty
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Get a value from an object using a dot-notation path
 * @param obj Source object
 * @param path Dot-notation path (e.g., "user.address.city")
 * @param defaultValue Default value if path doesn't exist
 * @returns Value at path or default value
 */
export function getPath<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const segments = path.split('.');
  let current = obj;
  
  for (const segment of segments) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[segment];
  }
  
  return (current === undefined) ? defaultValue : current;
}

/**
 * Set a value in an object using a dot-notation path
 * @param obj Object to modify
 * @param path Dot-notation path (e.g., "user.address.city")
 * @param value Value to set
 * @returns New object with the value set (original not modified)
 */
export function setPath<T>(obj: T, path: string, value: any): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = deepClone(obj);
  const segments = path.split('.');
  let current: any = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    if (current[segment] === undefined || current[segment] === null) {
      current[segment] = {};
    } else if (typeof current[segment] !== 'object' || Array.isArray(current[segment])) {
      return obj;
    }

    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
  return result;
}