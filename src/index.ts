/**
 * XJX Library - XML/JSON transformation with fluent API and semantic XNode system
 */

// IMPORTANT: Register all extensions by importing adapter and extension files
// These imports MUST be kept as they register methods on the XJX prototype
import "./adapters"; // Registers all adapter extensions
import "./extensions/config";
import "./extensions/functional-api";

// Export the main class (for instantiation)
export { XJX } from "./XJX";
export { default } from "./XJX";

// Export core configuration (format-neutral)
export {
  Configuration,
  getDefaultConfig,
  mergeConfig,
  createConfig,
  validateConfig
} from "./core/config";

// Export configuration utilities
export {
  getFragmentRootName,
  shouldPrettyPrint
} from "./core/config-utils";

export {
  // Semantic XNode model
  XNode,
  XNodeType,
  Primitive,
  createCollection,
  createRecord,
  createField,
  createValue,
  createAttributes,
  createComment,
  createInstruction,
  createData,
  addChild,
  addAttribute,
  cloneNode,
  getTextContent,
  setTextContent,
  getAttribute,
  getAttributeValue,
  hasAttributes,
  hasChildren,
  getNodeTypeName,
  isCollection,
  isRecord,
  isField,
  isValue,
  isAttribute,
  isComment,
  isInstruction,
  isData,
  isPrimitive,
  isContainer,
  getChildrenByType,
  getChildrenByName,
  getChild
} from "./core/xnode";

export {
  // Minimal transform system
  Transform,
  compose,
  createResultsContainer,
  collectNodesWithPaths,
  replaceNodeAtPath,
  removeNodeAtPath,
  getNodeAtPath,
  traverseTree,
  TreeVisitor,
  TraversalContext,
  TraversalOptions
} from "./core/tree-utils";

// Export logging
export { 
  LoggerFactory, 
  LogLevel,
  Logger
} from "./core/logger";

// Export error handling
export {
  ValidationError,
  ProcessingError,
  XJXError,
  validate,
  handleError
} from "./core/error";

// Export extension context interfaces
export {
  TerminalExtensionContext,
  NonTerminalExtensionContext,
  BranchContext,
  UnifiedExtensionContext
} from "./core/extension";

// Export pipeline system
export {
  PipelineStage,
  Adapter as UnifiedConverter,
  Pipeline
} from "./core/pipeline";

export {
  PipelineContext,
  PipelineContextImpl,
  ConfigurationManager,
  ResourceManager,
  ClonePolicy,
  ClonePolicies
} from "./core/context";

// Hooks system
export {
  SourceHooks,
  OutputHooks,
  NodeHooks,
  PipelineHooks
} from './core/hooks';

// Export transform functions and creators
export {
  // Transform Factories
  toNumber,
  toBoolean,
  regex,

  // Options interfaces
  NumberTransformOptions,
  BooleanTransformOptions,
} from "./transforms";

// Export DOM utilities
export {
  DOM,
  NodeType
} from "./core/dom";

// Export common utilities
export {
  deepClone,
  deepMerge,
  isEmpty,
  getPath,
  setPath
} from "./core/common";

// Export adapters for direct access
export * as adapters from "./adapters";

// Manual registration verification - this function does nothing at runtime
// but ensures that tree-shaking doesn't remove our extension imports
function ensureExtensionsRegistered() {
  return [
    "./adapters",
    "./extensions/config",
    "./extensions/functional-api"
  ];
}

// This will be removed in production builds but helps ensure extensions are loaded
ensureExtensionsRegistered();