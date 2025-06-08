/**
 * XJFN Library - XML/JSON/Format Neutral transformation with fluent API and semantic XNode system
 */

// IMPORTANT: Register all extensions by importing adapter and extension files
// These imports MUST be kept as they register methods on the XJFN prototype
import "./adapters"; // Registers all adapter extensions
import "./extensions/config";
import "./extensions/functional";

// Export the main class (for instantiation)
export { XJFN } from "./XJFN";
export { default } from "./XJFN";

// Export core configuration (format-neutral)
export type { Configuration } from "./core/config";
export { DEFAULT_CONFIG, createConfig, mergeGlobalDefaults } from "./core/config";

// Export core types and functions
export type {
  XNode,
  XNodeAttribute,
  Primitive
} from "./core/xnode";

export {
  XNodeType,
  createCollection,
  createRecord,
  createField,
  createValue,
  createComment,
  createInstruction,
  createData,
  addChild,
  addAttribute,
  cloneNode
} from "./core/xnode";

// Export logging
export { 
  LoggerFactory, 
  LogLevel
} from "./core/logger";
export type { Logger } from "./core/logger";

// Export error handling
export {
  ValidationError,
  ProcessingError,
  XJFNError
} from "./core/error";

// Export extension context interfaces
export type {
  ExtensionContext,
  ExtensionImplementation,
  BranchContext
} from "./core/extension";

// Export adapter interface
export type { Adapter } from "./core/adapter";
export { AdapterExecutor } from "./core/adapter";

// Export context
export { PipelineContext } from "./core/context";

// Export transform functions and creators
export {
  toNumber,
  toBoolean,
  regex,
  compose
} from "./transforms";

export type {
  Transform,
  NumberTransformOptions,
  BooleanTransformOptions
} from "./transforms";

// Export DOM utilities
export { DOM } from "./core/dom";

// Export adapters for direct access
export * as adapters from "./adapters";