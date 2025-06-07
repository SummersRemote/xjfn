/**
 * DOM operations with unified interface for browser and Node.js
 */
import { LoggerFactory } from "./logger";
const logger = LoggerFactory.create();

import { ProcessingError } from './error';

/**
 * DOM node types as an enum for better type safety
 */
export enum NodeType {
  ELEMENT_NODE = 1,
  ATTRIBUTE_NODE = 2,
  TEXT_NODE = 3, 
  CDATA_SECTION_NODE = 4,
  PROCESSING_INSTRUCTION_NODE = 7,
  COMMENT_NODE = 8,
  DOCUMENT_NODE = 9
}

/**
 * DOM implementation - provides unified access to DOM APIs
 */
export class DOM {
  
  static readonly NodeType = NodeType;

  // Environment-specific components
  private static domParser: any;
  private static xmlSerializer: any;
  private static docImplementation: any;
  private static jsdomInstance: any = null;
  private static initialized = false;
  
  /**
   * Initialize the DOM environment
   */
  static initialize(): void {
    if (this.initialized) return;
    
    try {
      logger.debug('Initializing DOM environment');
      
      if (typeof window === "undefined") {
        // Node.js environment - try JSDOM first
        try {
          const { JSDOM } = require("jsdom");
          this.jsdomInstance = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
            contentType: "text/xml",
          });

          this.domParser = this.jsdomInstance.window.DOMParser;
          this.xmlSerializer = this.jsdomInstance.window.XMLSerializer;
          this.docImplementation = this.jsdomInstance.window.document.implementation;
          
          logger.debug('Initialized DOM environment using JSDOM');
        } catch (jsdomError) {
          // Fall back to xmldom if JSDOM isn't available
          try {
            const { DOMParser, XMLSerializer, DOMImplementation } = require('@xmldom/xmldom');
            this.domParser = DOMParser;
            this.xmlSerializer = XMLSerializer;
            this.docImplementation = new DOMImplementation();
            
            logger.debug('Initialized DOM environment using xmldom');
          } catch (xmldomError) {
            throw new Error("Failed to initialize DOM environment. Install either jsdom or @xmldom/xmldom");
          }
        }
      } else {
        // Browser environment
        this.domParser = window.DOMParser;
        this.xmlSerializer = window.XMLSerializer;
        this.docImplementation = document.implementation;
        
        logger.debug('Initialized DOM environment using browser APIs');
      }
      
      this.initialized = true;
    } catch (err) {
      throw new Error(`Failed to initialize DOM environment: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  /**
   * Parse XML string to DOM document
   * @param xmlString XML string to parse
   * @param contentType Content type (default: text/xml)
   * @returns Parsed DOM document
   */
  static parseFromString(xmlString: string, contentType: string = 'text/xml'): Document {
    this.initialize();
    
    try {
      const parser = new this.domParser();
      const doc = parser.parseFromString(xmlString, contentType);
      
      // Check for parsing errors
      const errors = doc.getElementsByTagName("parsererror");
      if (errors.length > 0) {
        throw new ProcessingError(`XML parsing error: ${errors[0].textContent || "Unknown parse error"}`, xmlString);
      }
      
      return doc;
    } catch (err) {
      if (err instanceof ProcessingError) throw err;
      throw new ProcessingError(`Failed to parse XML: ${err instanceof Error ? err.message : String(err)}`, xmlString);
    }
  }
    
  /**
   * Serialize DOM node to XML string
   * @param node DOM node to serialize
   * @returns Serialized XML string
   */
  static serializeToString(node: Node): string {
    this.initialize();
    
    try {
      const serializer = new this.xmlSerializer();
      return serializer.serializeToString(node);
    } catch (err) {
      throw new ProcessingError(`Failed to serialize node: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a new XML document
   * @returns New document
   */
  static createDocument(): Document {
    this.initialize();
    
    try {
      // For browsers, create a document with a root element to avoid issues
      if (typeof window !== "undefined") {
        const parser = new this.domParser();
        return parser.parseFromString('<temp></temp>', 'text/xml');
      } else {
        return this.docImplementation.createDocument(null, null, null);
      }
    } catch (err) {
      throw new Error(`Failed to create document: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a DOM element
   * @param doc Document to create element in
   * @param tagName Tag name for the element
   * @returns New element
   */
  static createElement(doc: Document, tagName: string): Element {
    try {
      return doc.createElement(tagName);
    } catch (err) {
      throw new Error(`Failed to create element: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a namespaced DOM element
   * @param doc Document to create element in
   * @param namespaceURI Namespace URI
   * @param qualifiedName Qualified name with optional prefix
   * @returns New element with namespace
   */
  static createElementNS(doc: Document, namespaceURI: string, qualifiedName: string): Element {
    try {
      return doc.createElementNS(namespaceURI, qualifiedName);
    } catch (err) {
      throw new Error(`Failed to create namespaced element: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a text node
   * @param doc Document to create node in
   * @param data Text content
   * @returns New text node
   */
  static createTextNode(doc: Document, data: string): Text {
    try {
      return doc.createTextNode(data);
    } catch (err) {
      throw new Error(`Failed to create text node: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a CDATA section
   * @param doc Document to create node in
   * @param data CDATA content
   * @returns New CDATA section
   */
  static createCDATASection(doc: Document, data: string): CDATASection {
    try {
      return doc.createCDATASection(data);
    } catch (err) {
      throw new Error(`Failed to create CDATA section: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a comment node
   * @param doc Document to create node in
   * @param data Comment content
   * @returns New comment node
   */
  static createComment(doc: Document, data: string): Comment {
    try {
      return doc.createComment(data);
    } catch (err) {
      throw new Error(`Failed to create comment: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Create a processing instruction
   * @param doc Document to create node in
   * @param target Processing instruction target
   * @param data Processing instruction data
   * @returns New processing instruction
   */
  static createProcessingInstruction(doc: Document, target: string, data: string): ProcessingInstruction {
    try {
      return doc.createProcessingInstruction(target, data);
    } catch (err) {
      throw new Error(`Failed to create processing instruction: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
    
  /**
   * Get node type name for debugging
   * @param nodeType Node type number
   * @returns Human-readable node type name
   */
  static getNodeTypeName(nodeType: number): string {
    switch (nodeType) {
      case NodeType.ELEMENT_NODE: return 'ELEMENT_NODE';
      case NodeType.ATTRIBUTE_NODE: return 'ATTRIBUTE_NODE';
      case NodeType.TEXT_NODE: return 'TEXT_NODE';
      case NodeType.CDATA_SECTION_NODE: return 'CDATA_SECTION_NODE';
      case NodeType.PROCESSING_INSTRUCTION_NODE: return 'PROCESSING_INSTRUCTION_NODE';
      case NodeType.COMMENT_NODE: return 'COMMENT_NODE';
      case NodeType.DOCUMENT_NODE: return 'DOCUMENT_NODE';
      default: return `UNKNOWN_NODE_TYPE(${nodeType})`;
    }
  }
    
  /**
   * Get all node attributes as an object
   * @param node DOM element
   * @returns Object with attribute name-value pairs
   */
  static getNodeAttributes(node: Element): Record<string, string> {
    try {
      const result: Record<string, string> = {};
      
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        result[attr.name] = attr.value;
      }
      
      return result;
    } catch (err) {
      logger.warn('Failed to get node attributes', { nodeName: node?.nodeName });
      return {};
    }
  }
    
  /**
   * Cleanup method for releasing resources (mainly for JSDOM)
   */
  static cleanup(): void {
    if (this.jsdomInstance && typeof this.jsdomInstance.window.close === 'function') {
      this.jsdomInstance.window.close();
      logger.debug('Cleaned up JSDOM instance');
    }
  }
}