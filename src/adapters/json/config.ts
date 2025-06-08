/**
 * JSON Adapter Configuration - Configurable JSON format handling
 * 
 * Design Intent:
 * - Focus on compact, readable JSON representation for APIs and human consumption
 * - Configurable attribute and value handling strategies for flexibility
 * - Array handling with multiple strategies for different use cases
 * - Type preservation options for maintaining data semantics
 * - Lossy but readable conversion optimized for practical use
 */

export interface JsonConfig {
  // Attribute handling strategies
  attributePrefix: string;         // Prefix for XML attributes in JSON (default: '@')
  attributeStrategy: 'prefix' | 'property' | 'merge' | 'ignore'; // How to handle attributes
  
  // Value handling strategies
  valueProperty: string;           // Property name for element text content (default: '#text')
  valueStrategy: 'property' | 'direct' | 'merge'; // How to handle element values
  
  // Array handling strategies
  arrayStrategy: 'multiple' | 'always' | 'never' | 'smart'; // When to create arrays (default: 'smart')
  forceArrays: string[];           // Element names to always treat as arrays (default: [])
  singleItemArrays: boolean;       // Allow single-item arrays (default: false)
  defaultItemName: string;         // Name for array items when converting from JSON (default: 'item')
  
  // Type preservation options
  preserveNumbers: boolean;        // Keep numeric strings as numbers (default: true)
  preserveBooleans: boolean;       // Keep boolean strings as booleans (default: true)
  preserveNull: boolean;           // Keep null values vs converting to empty (default: true)
  preserveUndefined: boolean;      // Keep undefined values vs omitting (default: false)
  
  // Simplification options for readable JSON
  ignoreComments: boolean;         // Skip comment nodes (default: true)
  ignoreInstructions: boolean;     // Skip processing instructions (default: true)
  ignoreCData: boolean;           // Convert CDATA to regular text (default: true)
  ignoreNamespaces: boolean;      // Strip namespace information (default: false)
  
  // Advanced formatting options
  flattenSingleChildren: boolean; // Flatten single-child elements (default: false)
  compactEmptyElements: boolean;  // Represent empty elements as null/empty string (default: false)
  attributesAsProperties: boolean; // Mix attributes with child properties (default: false)
  textContentKey: string;         // Alternative to valueProperty for mixed content (default: '_')
  
  // Collection handling
  collectionWrapper: string;      // Wrap collections in named container (default: 'items')
  explicitCollections: boolean;   // Always show collection wrappers (default: false)
  
  // Metadata preservation (for round-trip capability)
  preserveTypes: boolean;         // Add type hints for XNode types (default: false)
  typeProperty: string;           // Property name for type metadata (default: '_type')
  preserveOrder: boolean;         // Maintain element order information (default: false)
  orderProperty: string;          // Property name for order metadata (default: '_order')
}

export const DEFAULT_JSON_CONFIG: JsonConfig = {
  // Attribute handling
  attributePrefix: '@',               // Standard JSON convention for attributes
  attributeStrategy: 'prefix',        // Use @attribute pattern
  
  // Value handling
  valueProperty: '#text',             // Standard property for text content
  valueStrategy: 'property',          // Use separate property for values
  
  // Array handling
  arrayStrategy: 'smart',             // Intelligent array detection
  forceArrays: [],                   // No forced arrays by default
  singleItemArrays: false,           // Flatten single items
  defaultItemName: 'item',           // Generic item name
  
  // Type preservation
  preserveNumbers: true,             // Convert numeric strings
  preserveBooleans: true,            // Convert boolean strings
  preserveNull: true,               // Keep null values
  preserveUndefined: false,         // Omit undefined values
  
  // Simplification for readable JSON
  ignoreComments: true,             // Skip comments for clean JSON
  ignoreInstructions: true,         // Skip processing instructions
  ignoreCData: true,               // Convert CDATA to text
  ignoreNamespaces: false,         // Preserve namespace info by default
  
  // Advanced formatting
  flattenSingleChildren: false,     // Preserve structure
  compactEmptyElements: false,      // Keep empty elements explicit
  attributesAsProperties: false,    // Keep attributes separate
  textContentKey: '_',             // Alternative text key
  
  // Collection handling
  collectionWrapper: 'items',       // Standard wrapper name
  explicitCollections: false,       // Implicit collections
  
  // Metadata preservation
  preserveTypes: false,             // Clean JSON by default
  typeProperty: '_type',           // Type metadata key
  preserveOrder: false,            // Order not preserved by default
  orderProperty: '_order'          // Order metadata key
};