/**
 * Adapters module - All format adapters for XJX
 */

// Import all adapters to register their extensions
import "./json";
import "./xml";
import "./xnode";

// Re-export individual adapters for direct imports
export * as json from "./json";
export * as xml from "./xml";
export * as xnode from "./xnode";