# XJX Framework Implementation Prompts by Phase

## Important Context

**This is a greenfield implementation - a complete clean break from existing code.** 

**Core Principles:**
- **Simplicity first** - Remove complexity, not add it
- **Consistency** - Same patterns throughout the codebase
- **Extensibility** - Clean plugin architecture for format adapters
- **Semantic foundation** - XNode system is format-neutral and semantic

Reference the detailed architecture document for complete specifications, interfaces, and examples.

---

## Phase 1: Core Infrastructure

You are implementing the foundational core infrastructure for a new data transformation library called XJX. This is a **greenfield implementation** emphasizing **simplicity and consistency**.

**Your Task:**
Implement the core infrastructure components that provide the semantic foundation for the entire framework:

1. **Enhanced XNode System** (`src/core/xnode.ts`)
   - Semantic node types (COLLECTION, RECORD, FIELD, VALUE, ATTRIBUTES, COMMENT, INSTRUCTION, DATA)
   - Structured attributes with namespace support (name, value, namespace, label)
   - Core creation functions (createRecord, createField, etc.)
   - Attribute operations (addAttribute, getAttribute, etc.)
   - Type guards and utility functions

2. **PipelineContext with Namespaced Metadata** (`src/core/context.ts`)
   - Simple context class with config, logger, metadata
   - Namespaced metadata system: `metadata[namespace][key] = value`
   - Methods: setMetadata, getMetadata, hasMetadata, clearMetadata
   - Node cloning and validation utilities

3. **Configuration System** (`src/core/config.ts`)
   - Format-neutral core configuration
   - Global defaults merging for extension configs
   - Simple object-based config (no wrapper classes)
   - Well-documented config options with intent/examples

4. **Extension System Foundation** (`src/core/extension.ts`)
   - Single ExtensionContext interface
   - BranchContext for branch/merge operations
   - Extension registration interfaces

5. **Adapter Interface** (`src/core/adapter.ts`)
   - Simple Adapter<TInput, TOutput> interface
   - AdapterExecutor with fail-fast error handling
   - Clear logging and error propagation

6. **Error Handling** (`src/core/error.ts`)
   - Simple error hierarchy (ValidationError, ProcessingError)
   - Fail-fast principle with clear messages

7. **Logging System** (`src/core/logger.ts`)
   - LoggerFactory and Logger classes
   - Configurable log levels
   - Simple, consistent logging interface

8. **Tree Traversal Utilities** (`src/core/traversal.ts`)
   - TreeVisitor interface
   - Single traverseTree function for all operations
   - Path-based node manipulation utilities

**Requirements:**
- Create complete, production-ready implementations
- Include comprehensive TypeScript types
- Add detailed JSDoc comments explaining intent
- Follow the exact interfaces specified in the architecture document
- Emphasize simplicity - no complex abstractions
- Ensure consistency across all components

**Deliverables:**
- Complete implementation files for all 8 components
- Each file should be a complete artifact with proper imports/exports
- All interfaces should match the architecture specification exactly

When complete, provide a phase summary covering:
- What was implemented
- Key design decisions made
- How the components work together
- Dependencies for the next phase

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 2: Main XJX Class & Extension Registration

You are implementing the main XJX class and extension registration system for the XJX data transformation library. This builds on the **Phase 1 core infrastructure** and is a **greenfield implementation** focusing on **simplicity and consistency**.

**Your Task:**
Create the main XJX class that serves as the entry point and extension host for the entire framework:

1. **Main XJX Class** (`src/XJX.ts`)
   - Implements ExtensionContext interface
   - Manages xnode, branchContext, and context (PipelineContext)
   - Constructor accepts optional configuration
   - Static extension registration method
   - Core operations: validateSource, executeAdapter
   - Automatic config defaults merging from extensions

2. **Extension Registration System**
   - Single `registerExtension` method for both terminal and non-terminal extensions
   - Automatic prototype method assignment
   - Configuration defaults merging into global defaults
   - Clear separation between terminal (return value) and non-terminal (return this) methods

3. **Adapter Execution Framework**
   - Integration with AdapterExecutor from Phase 1
   - Consistent error handling and logging
   - Metadata tracking during conversions

**Key Design Requirements:**
- **Simplicity**: Single registration method handles all extension types
- **Consistency**: Same pattern for all extensions (format adapters, functional operations, config methods)
- **Extensibility**: Clean plugin architecture - extensions register themselves on import
- **Automatic Configuration**: Extensions provide their config defaults when registering

**Implementation Details:**
- Extension methods are added to XJX.prototype dynamically
- Non-terminal methods wrapped to return `this` for chaining
- Terminal methods return their values directly
- Global configuration defaults automatically merged from extension configs
- Clear error handling with fail-fast principle

**Dependencies:**
- Phase 1: All core infrastructure components
- Must work with the exact interfaces defined in the architecture

**Deliverables:**
- Complete XJX.ts implementation
- Comprehensive TypeScript types and interfaces
- JSDoc documentation explaining the registration system
- Example usage patterns in comments

When complete, provide a phase summary covering:
- How the extension registration system works
- Configuration defaults merging mechanism
- Integration with Phase 1 components
- Readiness for Phase 3 and 4 extensions

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 3: Transform Functions

You are implementing pure transform functions for the XJX data transformation library. This is a **greenfield implementation** that emphasizes **simplicity and functional purity**. These transforms work with the XNode system from Phase 1.

**Your Task:**
Create a complete transform function library that provides pure, composable functions for data transformation:

1. **Transform Infrastructure** (`src/transforms/index.ts`)
   - Transform type definition: `(node: XNode) => XNode`
   - TransformTarget interface (transformValue, transformAttributes flags)
   - compose() function for functional composition
   - Clear exports and documentation

2. **Number Transform** (`src/transforms/number.ts`)
   - toNumber() function factory with NumberOptions
   - Support for precision, decimal/thousands separators
   - Configurable parsing (integers, decimals, scientific notation)
   - Transforms both node values and attributes based on flags

3. **Boolean Transform** (`src/transforms/boolean.ts`)
   - toBoolean() function factory with BooleanOptions
   - Configurable true/false value arrays
   - Always case-insensitive comparison (no ignoreCase option)
   - Transforms both node values and attributes based on flags

4. **Regex Transform** (`src/transforms/regex.ts`)
   - regex() function for pattern-based transformations
   - Support for RegExp objects and string patterns
   - Transforms both node values and attributes based on flags
   - Clear error handling for invalid patterns

**Key Design Requirements:**
- **Pure Functions**: No side effects, predictable results
- **Composability**: Functions work well with compose()
- **Simplicity**: Clean interfaces, no complex configuration
- **Consistency**: Same pattern across all transforms
- **Type Safety**: Full TypeScript support with proper generics

**Transform Behavior:**
- All transforms return new XNode objects (immutable)
- Failed transformations return original values (no errors)
- Clear configuration with sensible defaults
- Support for both node.value and node.attributes transformation
- No attribute filtering (removed for simplicity)

**Dependencies:**
- Phase 1: XNode system, types, and utilities
- Must integrate cleanly with map() operations (Phase 4)

**Deliverables:**
- Complete implementation of all transform functions
- Comprehensive TypeScript interfaces
- JSDoc with usage examples
- Unit test examples in comments
- Clear module exports

When complete, provide a phase summary covering:
- Transform function architecture and patterns
- How composition works
- Integration with XNode system
- Examples of common usage patterns

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 4: Functional Operations

You are implementing the core functional operations for the XJX data transformation library. This builds on **Phases 1-3** and is a **greenfield implementation** emphasizing **simplicity and consistency**. These operations provide the fluent API for tree manipulation.

**Your Task:**
Create the complete functional API that operates on XNode trees using the unified traversal system:

1. **Core Functional Operations** (`src/extensions/functional.ts`)
   - filter() - maintains hierarchy, removes non-matching nodes
   - map() - transforms every node using transform functions from Phase 3
   - select() - flattens matching nodes into collection (no hierarchy)
   - branch() - creates isolated scope for operations on matching nodes
   - merge() - applies branch changes back to parent document
   - reduce() - aggregates tree data to single value (terminal operation)

2. **Unified Traversal Integration**
   - All operations use the single traverseTree function from Phase 1
   - Consistent TreeVisitor pattern across operations
   - Error handling during traversal with logging
   - Path-based operations for branch/merge

3. **Extension Registration**
   - Register all operations using XJX.registerExtension from Phase 2
   - Clear separation: filter, map, select, branch, merge are non-terminal
   - reduce is terminal (returns value, not this)
   - No configuration defaults needed for functional operations

**Key Design Requirements:**
- **Simplicity**: Each operation has one clear purpose
- **Consistency**: Same error handling and logging patterns
- **Pure Functional Approach**: Operations don't modify original nodes
- **Single Traversal Algorithm**: All operations use traverseTree
- **Branch Simplicity**: No nested branches, simple path-based replacement

**Implementation Details:**
- Use context.cloneNode for immutable operations
- Consistent predicate error handling (log warning, continue)
- Branch context stores original paths for merge operations
- Fragment root from configuration for results containers
- Metadata tracking where appropriate

**Dependencies:**
- Phase 1: XNode system, traversal utilities, PipelineContext
- Phase 2: Extension registration system
- Phase 3: Transform functions for map() operations

**Deliverables:**
- Complete functional.ts implementation
- All six operations fully implemented
- Extension registrations at end of file
- Comprehensive JSDoc with usage examples
- Helper functions for path manipulation

When complete, provide a phase summary covering:
- How all operations integrate with traversal system
- Branch/merge workflow and limitations
- Error handling patterns
- Integration with transform functions
- Examples of operation chaining

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 5: Format Adapters

You are implementing self-contained format adapters for the XJX data transformation library. This builds on **Phases 1-4** and is a **greenfield implementation** emphasizing **adapter self-containment and format-specific intelligence**.

**Your Task:**
Create complete, production-ready XML and JSON format adapters that handle all format-specific concerns:

1. **XML Adapter** (`src/adapters/xml.ts`)
   - XmlToXNodeAdapter: XML string → XNode conversion
   - XNodeToXmlAdapter: XNode → XML string conversion
   - XmlConfig interface with comprehensive options
   - Extension methods: fromXml(), toXml(), toXmlString()
   - Rich namespace support, CDATA, comments, processing instructions
   - Metadata tracking (hasDeclaration, hasNamespaces, originalLength)

2. **JSON Adapter** (`src/adapters/json.ts`)
   - JsonToXNodeAdapter: JSON object → XNode conversion
   - XNodeToJsonAdapter: XNode → JSON object conversion
   - JsonConfig interface with high-fidelity options
   - Extension methods: fromJson(), toJson(), toJsonString()
   - Configurable attribute handling, array strategies
   - Metadata tracking (originalType, isArray, hasAttributes)

3. **Adapter Self-Registration**
   - Each adapter registers its extensions with XJX.registerExtension
   - Comprehensive configuration defaults provided during registration
   - Extensions use executeAdapter() from Phase 2 for execution

**Key Design Requirements:**
- **Self-Contained**: All format-specific logic within adapter files
- **Rich Configuration**: Extensive options with clear documentation
- **High-Fidelity Support**: Enable round-trip conversions
- **Metadata Intelligence**: Store source characteristics for processing decisions
- **Fail-Fast Validation**: Clear error messages for invalid input
- **Namespace Support**: Full XML namespace handling

**XML Adapter Features:**
- DOM abstraction for browser/Node.js compatibility
- Namespace preservation with label (prefix) support
- CDATA, comments, processing instruction handling
- XML declaration generation with encoding/standalone
- Comprehensive validation and error handling

**JSON Adapter Features:**
- High-fidelity mode for XML round-trips
- Configurable attribute prefix (@, $, etc.)
- Multiple array handling strategies
- Special property handling (#text, #namespace, etc.)
- Type preservation options (numbers, booleans)

**Dependencies:**
- Phase 1: XNode system, DOM utilities, PipelineContext
- Phase 2: Extension registration, adapter execution
- Must integrate seamlessly with functional operations from Phase 4

**Deliverables:**
- Complete xml.ts implementation with all features
- Complete json.ts implementation with all features
- Comprehensive configuration interfaces with documented options
- Extension registrations with full default configurations
- Rich metadata tracking throughout conversion process

When complete, provide a phase summary covering:
- Adapter architecture and self-containment principles
- Configuration system and defaults mechanism
- Metadata tracking strategy and benefits
- Round-trip conversion capabilities
- Integration with core framework

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 6: Configuration Extensions

You are implementing configuration management extensions for the XJX data transformation library. This builds on **Phases 1-5** and is a **greenfield implementation** focusing on **simple, direct configuration management**.

**Your Task:**
Create configuration extensions that provide a clean API for managing library configuration:

1. **Configuration Extensions** (`src/extensions/config.ts`)
   - withConfig() - merges configuration updates
   - withLogLevel() - sets logging level
   - Integration with PipelineContext from Phase 1
   - Validation of configuration changes after source is set

2. **Configuration Management Features**
   - Direct configuration merging without wrapper classes
   - Prevention of preservation setting changes after source is set
   - Clear error messages for invalid configuration
   - Support for string and enum log levels
   - Logging of configuration changes

**Key Design Requirements:**
- **Simplicity**: Direct object merging, no complex validation
- **Consistency**: Same extension registration pattern as other phases
- **User-Friendly**: Clear error messages, flexible input handling
- **Safety**: Prevent configurations that would cause inconsistent behavior

**Implementation Details:**
- Use context.mergeConfig() for simple object merging
- Validate preservation settings only if source is already set
- Support both LogLevel enum and string inputs for withLogLevel()
- Clear logging of configuration changes
- Fail-fast validation with meaningful error messages

**Configuration Validation:**
- Check for preservation setting changes (preserveComments, preserveInstructions, preserveWhitespace)
- Only validate these after source is set (this.xnode !== null)
- Allow all other configuration changes at any time
- Provide clear guidance on when settings must be applied

**Dependencies:**
- Phase 1: PipelineContext, Configuration interfaces, LoggerFactory
- Phase 2: Extension registration system
- Must work with format adapters from Phase 5

**Deliverables:**
- Complete config.ts implementation
- Both configuration extensions fully implemented
- Extension registrations (non-terminal methods)
- Comprehensive error handling and validation
- Clear JSDoc documentation with examples

When complete, provide a phase summary covering:
- Configuration management approach and philosophy
- Validation strategy and timing
- Integration with PipelineContext
- User experience considerations
- Error handling patterns

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Phase 7: Integration & Exports

You are implementing the final integration and public API exports for the XJX data transformation library. This brings together **all previous phases** in a **greenfield implementation** emphasizing **clean public API and easy usage**.

**Your Task:**
Create the final integration layer that assembles the complete library with proper exports and auto-registration:

1. **Main Index File** (`src/index.ts`)
   - Import all extension files to trigger auto-registration
   - Export main XJX class and default export
   - Export all core interfaces and types
   - Export utility functions and helpers
   - Export adapters and transforms for direct access
   - Ensure extension registration verification

2. **Adapter Integration** (`src/adapters/index.ts`)
   - Export all format adapters
   - Re-export adapter interfaces and types
   - Provide clear access to adapter functionality

3. **Transform Integration** (`src/transforms/index.ts`)
   - Export all transform functions and interfaces
   - Provide transform utilities and composition
   - Clear documentation of transform patterns

4. **TypeScript Declarations**
   - Ensure all exports have proper TypeScript types
   - Verify complete type coverage
   - Clean module structure for consumers

**Key Design Requirements:**
- **Complete Library**: All functionality available through imports
- **Clean API**: Logical export organization
- **Auto-Registration**: Extensions register automatically on import
- **Type Safety**: Full TypeScript support throughout
- **Easy Usage**: Clear entry points for different use cases

**Integration Verification:**
- All extensions properly registered when library imports
- Configuration defaults from all extensions merged
- No missing dependencies or circular imports
- Clean module boundaries
- Proper tree-shaking support

**Export Organization:**
- Main XJX class and configuration
- Core XNode system and utilities
- Transform functions and composition
- Extension contexts and interfaces
- Error types and logging
- Direct adapter access for advanced usage

**Dependencies:**
- All previous phases (1-6)
- Must ensure clean integration without breaking changes
- Verify complete functionality through organized exports

**Deliverables:**
- Complete index.ts with all exports
- Adapter and transform index files
- Verification function for extension registration
- Clean module structure
- JSDoc documentation for public API

When complete, provide a phase summary covering:
- Complete library structure and exports
- Extension auto-registration mechanism
- Public API organization and philosophy
- Usage patterns for different scenarios
- Final architecture overview and benefits

Please acknowledge this task and ask any clarifying questions before proceeding.

---

## Implementation Notes

### General Guidelines for All Phases

**Clean Break Approach:**
- This is a complete greenfield implementation
- Do not reference or attempt compatibility with existing code
- Focus on the cleanest, simplest implementation possible

**Consistency Requirements:**
- Use the same patterns across all phases
- Consistent error handling with fail-fast principle
- Same logging approach throughout
- Uniform TypeScript conventions

**Simplicity Focus:**
- Remove complexity, don't add it
- Prefer simple objects over classes where possible
- Avoid over-engineering and complex abstractions
- Clear, direct implementations

**Phase Dependencies:**
- Each phase builds cleanly on previous phases
- No forward dependencies or circular imports
- Clear integration points between phases
- Modular architecture for easy testing

**Quality Standards:**
- Complete, production-ready implementations
- Comprehensive TypeScript types
- Clear JSDoc documentation
- Proper error handling throughout
- Consistent code organization

### Success Criteria

At the end of all phases, the XJX library should provide:
- **Clean Architecture**: Clear separation between core and adapters
- **Extensibility**: Easy addition of new format adapters
- **Consistency**: Same patterns throughout the codebase
- **Simplicity**: Minimal complexity in core systems
- **Functionality**: Complete XML/JSON conversion with high fidelity
- **Type Safety**: Full TypeScript support
- **Usability**: Intuitive fluent API for common operations