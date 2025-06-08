/**
 * XNode Adapter Configuration - Lossless semantic tree serialization settings
 * 
 * Design Intent:
 * - Perfect fidelity preservation of all XNode semantics and metadata
 * - Enable lossless round-trip conversions for any source format
 * - Direct JSON serialization of XNode tree structure maintaining all properties
 * - Support for validation, compression, and processing pipeline integration
 * - Format-neutral archival and data processing capabilities
 */

export interface XNodeConfig {
  // Serialization fidelity options
  includeParentReferences: boolean;    // Include parent references in serialization (default: false - avoid circular refs)
  preserveUndefined: boolean;          // Preserve undefined values vs null (default: true)
  preserveEmptyArrays: boolean;        // Keep empty children arrays vs omitting (default: true)
  preserveEmptyAttributes: boolean;    // Keep empty attribute arrays vs omitting (default: true)
  
  // Validation options
  validateOnSerialize: boolean;        // Validate XNode structure before serialization (default: false)
  validateOnDeserialize: boolean;      // Validate structure during deserialization (default: true)
  strictTypeValidation: boolean;       // Enforce strict XNode type validation (default: true)
  allowCustomProperties: boolean;      // Allow additional properties beyond standard XNode (default: false)
  
  // Output formatting options
  compactFormat: boolean;              // Use compact JSON format without indentation (default: false)
  sortKeys: boolean;                   // Sort object keys for consistent output (default: false)
  includeMetadata: boolean;           // Include serialization metadata (default: true)
  
  // Performance options
  deepCloneNodes: boolean;            // Deep clone nodes during serialization (default: false)
  validateCircularRefs: boolean;      // Check for circular references (default: true)
  maxDepth: number;                   // Maximum tree depth to serialize (default: 1000)
  
  // Compatibility options
  legacyFormat: boolean;              // Use legacy serialization format (default: false)
  versionInfo: boolean;               // Include version information (default: true)
  schemaValidation: boolean;          // Validate against XNode schema (default: false)
  
  // Processing hints for round-trip preservation
  preserveSourceHints: boolean;       // Keep original format hints (default: true)
  includeProcessingMetadata: boolean; // Include processing pipeline metadata (default: false)
  timestampSerialization: boolean;   // Add timestamp to serialization (default: true)
}

export const DEFAULT_XNODE_CONFIG: XNodeConfig = {
  // Serialization fidelity
  includeParentReferences: false,     // Avoid circular references by default
  preserveUndefined: true,           // Distinguish undefined from null
  preserveEmptyArrays: true,         // Keep structure information
  preserveEmptyAttributes: true,     // Preserve attribute containers
  
  // Validation
  validateOnSerialize: false,        // Performance-friendly default
  validateOnDeserialize: true,       // Ensure data integrity on load
  strictTypeValidation: true,        // Enforce XNode type safety
  allowCustomProperties: false,      // Strict XNode compliance
  
  // Output formatting
  compactFormat: false,              // Pretty format by default
  sortKeys: false,                   // Preserve insertion order
  includeMetadata: true,             // Include helpful metadata
  
  // Performance
  deepCloneNodes: false,             // Avoid unnecessary copying
  validateCircularRefs: true,        // Safety check for circular refs
  maxDepth: 1000,                    // Reasonable depth limit
  
  // Compatibility
  legacyFormat: false,               // Use current format
  versionInfo: true,                 // Include version for compatibility
  schemaValidation: false,           // Skip expensive schema validation
  
  // Processing hints
  preserveSourceHints: true,         // Keep round-trip information
  includeProcessingMetadata: false,  // Clean output by default
  timestampSerialization: true      // Track when serialized
};