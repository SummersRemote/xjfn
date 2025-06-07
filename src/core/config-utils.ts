/**
 * Core configuration utility functions - Format-neutral utilities only
 * Adapter-specific utilities moved to their respective adapter modules
 */
import { Configuration } from './config';

/**
 * Get fragment root name as string from configuration
 */
export function getFragmentRootName(config: Configuration): string {
  const fragmentRoot = config.fragmentRoot;
  return typeof fragmentRoot === "string" ? fragmentRoot : fragmentRoot.name || "results";
}

/**
 * Get general pretty print setting (format-neutral)
 */
export function shouldPrettyPrint(config: Configuration): boolean {
  return config.formatting.pretty;
}