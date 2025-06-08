/**
 * XML Adapter - Self-contained XML format conversion with extension registration
 * 
 * Design Intent:
 * - Provide complete XML to XNode and XNode to XML conversion
 * - Self-register extension methods with comprehensive configuration defaults
 * - Enable high-fidelity XML processing with namespace and metadata support
 * - Fail-fast validation with clear error messages
 * - Support both string and Document object output formats
 */

import { ExtensionContext } from '../../core/extension';
import { ValidationError } from '../../core/error';
import { DOM } from '../../core/dom';
import { XJFN } from '../../XJFN';
import { XmlToXNodeAdapter, XNodeToXmlAdapter } from './adapter';
import { DEFAULT_XML_CONFIG } from './config';

// Export configuration and adapters for external use
export type { XmlConfig } from './config';
export { DEFAULT_XML_CONFIG } from './config';
export { XmlToXNodeAdapter, XNodeToXmlAdapter } from './adapter';

/**
 * Parse XML string into XNode tree representation
 * 
 * @param xml XML string to parse
 * @throws ValidationError if input is invalid
 * @throws ProcessingError if XML parsing fails
 */
export function fromXml(this: ExtensionContext, xml: string): void {
  if (typeof xml !== 'string') {
    throw new ValidationError('fromXml() requires a string input');
  }
  
  const adapter = new XmlToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, xml);
  
  // Log successful conversion with metadata
  this.context.logger.debug('XML parsed successfully', {
    hasNamespaces: this.context.getMetadata('xml', 'hasNamespaces'),
    hasDeclaration: this.context.getMetadata('xml', 'hasDeclaration'),
    rootElement: this.context.getMetadata('xml', 'rootElementName'),
    originalLength: this.context.getMetadata('xml', 'originalLength')
  });
}

/**
 * Convert XNode tree to XML string representation
 * 
 * @returns XML string with declaration and formatting per configuration
 * @throws ValidationError if no source XNode is set
 */
export function toXmlString(this: ExtensionContext): string {
  this.validateSource();
  
  const adapter = new XNodeToXmlAdapter();
  const result = this.executeAdapter(adapter, this.xnode!);
  
  // Log successful conversion with metadata
  this.context.logger.debug('XML generated successfully', {
    outputLength: this.context.getMetadata('xmlOutput', 'outputLength'),
    hasDeclaration: this.context.getMetadata('xmlOutput', 'hasDeclaration'),
    preservesNamespaces: this.context.getMetadata('xmlOutput', 'preservesNamespaces')
  });
  
  return result;
}

/**
 * Convert XNode tree to XML Document object
 * 
 * @returns XML Document object for DOM manipulation
 * @throws ValidationError if no source XNode is set
 */
export function toXml(this: ExtensionContext): Document {
  this.validateSource();
  
  const xmlString = this.executeAdapter(new XNodeToXmlAdapter(), this.xnode!);
  const doc = DOM.parseFromString(xmlString, 'text/xml');
  
  // Check for parsing errors in generated XML
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    this.context.logger.error('Generated XML contains parsing errors', parserError.textContent);
    throw new ValidationError(`Generated XML is invalid: ${parserError.textContent}`);
  }
  
  this.context.logger.debug('XML Document generated successfully');
  return doc;
}

/**
 * Get XML-specific metadata from the current conversion context
 * 
 * @param key Optional specific metadata key to retrieve
 * @returns XML metadata object or specific value
 */
export function getXmlMetadata(this: ExtensionContext, key?: string): any {
  this.validateSource();
  return this.context.getMetadata('xml', key);
}

/**
 * Check if the current XNode tree originated from XML with namespaces
 * 
 * @returns true if source XML contained namespace declarations
 */
export function hasXmlNamespaces(this: ExtensionContext): boolean {
  this.validateSource();
  return this.context.getMetadata('xml', 'hasNamespaces') === true;
}

/**
 * Check if the current XNode tree originated from XML with an XML declaration
 * 
 * @returns true if source XML contained <?xml declaration
 */
export function hasXmlDeclaration(this: ExtensionContext): boolean {
  this.validateSource();
  return this.context.getMetadata('xml', 'hasDeclaration') === true;
}

// Register XML extensions with comprehensive default configuration
XJFN.registerExtension('fromXml', { method: fromXml, isTerminal: false }, {
  xml: DEFAULT_XML_CONFIG
});

XJFN.registerExtension('toXmlString', { method: toXmlString, isTerminal: true });
XJFN.registerExtension('toXml', { method: toXml, isTerminal: true });
XJFN.registerExtension('getXmlMetadata', { method: getXmlMetadata, isTerminal: true });
XJFN.registerExtension('hasXmlNamespaces', { method: hasXmlNamespaces, isTerminal: true });
XJFN.registerExtension('hasXmlDeclaration', { method: hasXmlDeclaration, isTerminal: true });