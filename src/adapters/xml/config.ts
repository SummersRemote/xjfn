/**
 * XML Adapter Configuration - Self-contained XML format settings
 * 
 * Design Intent:
 * - Comprehensive XML-specific configuration options
 * - Support for namespace handling, declaration generation, and content preservation
 * - Clear separation between input parsing and output formatting options
 * - Enable both high-fidelity and simplified XML processing
 */

export interface XmlConfig {
  // Content preservation options
  preserveNamespaces: boolean;     // Maintain namespace URIs and prefixes (default: true)
  preserveComments: boolean;       // Keep XML comment nodes (default: true)
  preserveInstructions: boolean;   // Keep processing instructions like <?xml-stylesheet?> (default: true)
  preserveCDATA: boolean;          // Keep CDATA sections as separate nodes (default: true)
  preserveWhitespace: boolean;     // Keep whitespace-only text nodes (default: false)
  
  // Output formatting options
  declaration: boolean;            // Include <?xml version="1.0"?> declaration (default: true)
  encoding: string;                // Character encoding for declaration (default: 'UTF-8')
  standalone?: boolean;            // Standalone attribute in declaration (default: undefined)
  
  // Namespace handling
  defaultNamespace?: string;       // Default namespace URI when none specified
  namespacePrefixes: Record<string, string>; // Mapping of namespace URI to preferred prefix
  
  // Advanced options
  ignoreNamespaceDeclarations: boolean; // Skip xmlns attributes during parsing (default: false)
  normalizeWhitespace: boolean;    // Normalize whitespace in text nodes (default: false)
  attributeCase: 'preserve' | 'lower' | 'upper'; // Attribute name case handling (default: 'preserve')
  elementCase: 'preserve' | 'lower' | 'upper';   // Element name case handling (default: 'preserve')
}

export const DEFAULT_XML_CONFIG: XmlConfig = {
  preserveNamespaces: true,
  preserveComments: true,
  preserveInstructions: true,
  preserveCDATA: true,
  preserveWhitespace: false,
  declaration: true,
  encoding: 'UTF-8',
  namespacePrefixes: {},
  ignoreNamespaceDeclarations: false,
  normalizeWhitespace: false,
  attributeCase: 'preserve',
  elementCase: 'preserve'
};