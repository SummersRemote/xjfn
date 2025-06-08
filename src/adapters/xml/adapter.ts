/**
 * XML Adapter Implementation - Self-contained XML to XNode conversion
 * 
 * Design Intent:
 * - Handle XML-specific features (namespaces, CDATA, processing instructions)
 * - Provide high-fidelity conversion capabilities with metadata tracking
 * - Fail fast on invalid XML with clear error messages
 * - Support both browser and Node.js environments via DOM abstraction
 * - Self-contained format-specific logic with no external dependencies
 */

import { Adapter } from '../../core/adapter';
import { XNode, XNodeType, createRecord, createField, createComment, createInstruction, createData, addChild, addAttribute } from '../../core/xnode';
import { PipelineContext } from '../../core/context';
import { DOM } from '../../core/dom';
import { ValidationError, ProcessingError } from '../../core/error';
import { XmlConfig } from './config';

/**
 * XML String to XNode Conversion Adapter
 * 
 * Converts XML string input to semantic XNode tree representation
 * with full preservation of XML-specific features and metadata tracking
 */
export class XmlToXNodeAdapter implements Adapter<string, XNode> {
  name = 'xml-to-xnode';
  
  validate(xml: string, _context: PipelineContext): void {
    if (!xml || typeof xml !== 'string') {
      throw new ValidationError('XML input must be a non-empty string');
    }
    
    if (!xml.trim()) {
      throw new ValidationError('XML input cannot be empty or whitespace-only');
    }
    
    // Basic XML structure validation
    const trimmed = xml.trim();
    if (!trimmed.startsWith('<') || !trimmed.includes('>')) {
      throw new ValidationError('Input does not appear to be valid XML - must start with < and contain >');
    }
  }
  
  execute(xml: string, context: PipelineContext): XNode {
    const config = context.config.xml as XmlConfig;
    
    try {
      const trimmedXml = xml.trim();
      const doc = DOM.parseFromString(trimmedXml, 'text/xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new ProcessingError(`XML parsing failed: ${parserError.textContent}`, trimmedXml);
      }
      
      // Store metadata about the original XML
      context.setMetadata('xml', 'hasDeclaration', trimmedXml.startsWith('<?xml'));
      context.setMetadata('xml', 'originalLength', xml.length);
      context.setMetadata('xml', 'hasNamespaces', !!doc.documentElement.namespaceURI);
      context.setMetadata('xml', 'rootElementName', doc.documentElement.localName || doc.documentElement.nodeName);
      context.setMetadata('xml', 'encoding', this.extractEncodingFromDeclaration(trimmedXml));
      context.setMetadata('xml', 'standalone', this.extractStandaloneFromDeclaration(trimmedXml));
      
      return this.convertElementToXNode(doc.documentElement, config, context);
    } catch (error) {
      if (error instanceof ProcessingError) {
        throw error;
      }
      throw new ProcessingError(`XML parsing failed: ${error instanceof Error ? error.message : String(error)}`, xml);
    }
  }
  
  private extractEncodingFromDeclaration(xml: string): string | undefined {
    const declarationMatch = xml.match(/^<\?xml[^>]+encoding\s*=\s*["']([^"']+)["']/);
    return declarationMatch ? declarationMatch[1] : undefined;
  }
  
  private extractStandaloneFromDeclaration(xml: string): boolean | undefined {
    const declarationMatch = xml.match(/^<\?xml[^>]+standalone\s*=\s*["']([^"']+)["']/);
    if (!declarationMatch) return undefined;
    return declarationMatch[1].toLowerCase() === 'yes';
  }
  
  private convertElementToXNode(element: Element, config: XmlConfig, context: PipelineContext): XNode {
    const elementName = this.getElementName(element, config);
    const node = createRecord(elementName);
    
    // Handle namespace information
    if (config.preserveNamespaces) {
      if (element.namespaceURI) {
        node.namespace = element.namespaceURI;
      }
      if (element.prefix) {
        node.label = element.prefix;
      }
    }
    
    // Convert attributes
    Array.from(element.attributes).forEach(attr => {
      // Skip namespace declarations unless preserving them
      if (config.ignoreNamespaceDeclarations && attr.name.startsWith('xmlns')) {
        return;
      }
      
      const attrName = this.getAttributeName(attr, config);
      const attrOptions: any = {};
      
      if (config.preserveNamespaces) {
        if (attr.namespaceURI) {
          attrOptions.namespace = attr.namespaceURI;
        }
        if (attr.prefix) {
          attrOptions.label = attr.prefix;
        }
      }
      
      addAttribute(node, attrName, attr.value, attrOptions);
    });
    
    // Convert child nodes
    Array.from(element.childNodes).forEach(child => {
      const childNode = this.convertDomNodeToXNode(child, config, context);
      if (childNode) {
        addChild(node, childNode);
      }
    });
    
    return node;
  }
  
  private convertDomNodeToXNode(domNode: Node, config: XmlConfig, context: PipelineContext): XNode | null {
    switch (domNode.nodeType) {
      case DOM.NodeType.ELEMENT_NODE:
        return this.convertElementToXNode(domNode as Element, config, context);
        
      case DOM.NodeType.TEXT_NODE:
        const textContent = domNode.textContent || '';
        if (!config.preserveWhitespace && !textContent.trim()) {
          return null;
        }
        const processedText = config.normalizeWhitespace ? 
          textContent.replace(/\s+/g, ' ').trim() : textContent;
        return createField('#text', processedText);
        
      case DOM.NodeType.CDATA_SECTION_NODE:
        if (!config.preserveCDATA) return null;
        return createData('#cdata', domNode.textContent || '');
        
      case DOM.NodeType.COMMENT_NODE:
        if (!config.preserveComments) return null;
        return createComment(domNode.textContent || '');
        
      case DOM.NodeType.PROCESSING_INSTRUCTION_NODE:
        if (!config.preserveInstructions) return null;
        const pi = domNode as ProcessingInstruction;
        return createInstruction(pi.target, pi.data);
        
      default:
        context.logger.debug(`Skipping unsupported node type: ${domNode.nodeType}`);
        return null;
    }
  }
  
  private getElementName(element: Element, config: XmlConfig): string {
    const name = element.localName || element.nodeName;
    switch (config.elementCase) {
      case 'lower': return name.toLowerCase();
      case 'upper': return name.toUpperCase();
      case 'preserve':
      default: return name;
    }
  }
  
  private getAttributeName(attr: Attr, config: XmlConfig): string {
    const name = attr.localName || attr.name;
    switch (config.attributeCase) {
      case 'lower': return name.toLowerCase();
      case 'upper': return name.toUpperCase();
      case 'preserve':
      default: return name;
    }
  }
}

/**
 * XNode to XML String Conversion Adapter
 * 
 * Converts XNode tree representation to XML string output
 * with full namespace support and configurable formatting
 */
export class XNodeToXmlAdapter implements Adapter<XNode, string> {
  name = 'xnode-to-xml';
  
  execute(xnode: XNode, context: PipelineContext): string {
    const config = context.config.xml as XmlConfig;
    
    // Store metadata about the conversion
    context.setMetadata('xmlOutput', 'hasDeclaration', config.declaration);
    context.setMetadata('xmlOutput', 'encoding', config.encoding);
    context.setMetadata('xmlOutput', 'preservesNamespaces', config.preserveNamespaces);
    
    const doc = DOM.createDocument();
    const element = this.convertXNodeToElement(xnode, doc, config, context);
    doc.appendChild(element);
    
    let result = DOM.serializeToString(doc);
    
    // Add XML declaration if requested
    if (config.declaration) {
      const declaration = this.buildXmlDeclaration(config, context);
      result = declaration + (context.config.formatting.pretty ? '\n' : '') + result;
    }
    
    // Store final metadata
    context.setMetadata('xmlOutput', 'outputLength', result.length);
    context.setMetadata('xmlOutput', 'generatedAt', new Date().toISOString());
    
    return result;
  }
  
  private buildXmlDeclaration(config: XmlConfig, _context: PipelineContext): string {
    let declaration = `<?xml version="1.0" encoding="${config.encoding}"`;
    
    if (config.standalone !== undefined) {
      declaration += ` standalone="${config.standalone ? 'yes' : 'no'}"`;
    }
    
    declaration += '?>';
    return declaration;
  }
  
  private convertXNodeToElement(xnode: XNode, doc: Document, config: XmlConfig, context: PipelineContext): Element {
    let element: Element;
    
    if (xnode.namespace && config.preserveNamespaces) {
      const qualifiedName = xnode.label ? `${xnode.label}:${xnode.name}` : xnode.name;
      element = DOM.createElementNS(doc, xnode.namespace, qualifiedName);
    } else {
      element = DOM.createElement(doc, xnode.name);
    }
    
    // Add attributes
    if (xnode.attributes) {
      xnode.attributes.forEach(attr => {
        if (attr.namespace && config.preserveNamespaces) {
          const qualifiedName = attr.label ? `${attr.label}:${attr.name}` : attr.name;
          element.setAttributeNS(attr.namespace, qualifiedName, String(attr.value));
        } else {
          element.setAttribute(attr.name, String(attr.value));
        }
      });
    }
    
    // Add children
    if (xnode.children) {
      xnode.children.forEach(child => {
        const childNode = this.convertXNodeToDomNode(child, doc, config, context);
        if (childNode) {
          element.appendChild(childNode);
        }
      });
    }
    
    // Add text value if present
    if (xnode.value !== undefined && xnode.value !== null) {
      const textNode = DOM.createTextNode(doc, String(xnode.value));
      element.appendChild(textNode);
    }
    
    return element;
  }
  
  private convertXNodeToDomNode(xnode: XNode, doc: Document, config: XmlConfig, context: PipelineContext): Node | null {
    switch (xnode.type) {
      case XNodeType.RECORD:
      case XNodeType.COLLECTION:
        return this.convertXNodeToElement(xnode, doc, config, context);
        
      case XNodeType.FIELD:
      case XNodeType.VALUE:
        return DOM.createTextNode(doc, String(xnode.value || ''));
        
      case XNodeType.COMMENT:
        return config.preserveComments ? DOM.createComment(doc, String(xnode.value || '')) : null;
        
      case XNodeType.INSTRUCTION:
        return config.preserveInstructions ? DOM.createProcessingInstruction(doc, xnode.name, String(xnode.value || '')) : null;
        
      case XNodeType.DATA:
        return config.preserveCDATA ? DOM.createCDATASection(doc, String(xnode.value || '')) : null;
        
      default:
        context.logger.debug(`Skipping XNode type: ${xnode.type}`);
        return null;
    }
  }
}