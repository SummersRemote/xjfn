# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XJFN (XML/JSON/Format Neutral) is a TypeScript library for data transformation between XML, JSON, and other formats through a semantic, format-neutral intermediate representation (XNode). The library emphasizes lossless conversions, extensibility, and a fluent functional API.

## Development Commands

### Building and Type Checking
- `npm run build` - Clean and build TypeScript to dist/
- `npm run clean` - Remove dist/ directory 
- `npm run typecheck` - Type check without emitting files

### Testing
- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report (90% threshold)
- `npm run test:verbose` - Run tests with verbose output

### Code Quality
- `npm run lint` - Lint TypeScript files in src/
- `npm run lint:fix` - Auto-fix linting issues

### Running Single Tests
Use Jest's pattern matching:
```bash
npm test -- --testNamePattern="specific test name"
npm test -- tests/core/xnode.test.ts
npm test -- --testPathPattern="extensions"
```

## Architecture Overview

### Core Design Principles
- **Semantic XNode System**: Format-neutral tree representation preserving all source semantics
- **Adapter Pattern**: Self-contained format converters (XML, JSON, XNode serialization)
- **Extension Registration**: Dynamic method registration on XJFN prototype with unified context
- **Pipeline Context**: Centralized configuration, logging, and metadata management

### Key Components

#### 1. XJFN Main Class (`src/XJFN.ts`)
- Primary entry point providing fluent API
- Extension registration system via `XJFN.registerExtension()`
- Unified context for both terminal (return values) and non-terminal (return this) extensions
- Automatic configuration defaults merging from extensions

#### 2. XNode Semantic Model (`src/core/xnode.ts`)
- Format-neutral tree representation with semantic node types
- Node types: Collection, Record, Field, Value, Attribute, Comment, Instruction, Data
- Preserves all source format semantics for perfect round-trip conversions

#### 3. Adapter System (`src/core/adapter.ts`)
- Format-specific conversion logic isolated in adapters
- Located in `src/adapters/` with subdirectories per format
- Executed via `AdapterExecutor.execute()` with consistent error handling

#### 4. Extension System (`src/core/extension.ts`)
- Single `ExtensionContext` interface for all extensions
- Extensions register methods on XJFN prototype during import
- Support for branch/merge operations with `BranchContext`

#### 5. Pipeline Context (`src/core/context.ts`)
- Configuration management with format-specific sections
- Metadata tracking (source characteristics, processing hints)
- Centralized logging and error handling

### Extension Loading Pattern
Extensions are registered automatically via imports in `src/index.ts`:
```typescript
import "./adapters"; // Registers fromXml, toJson, etc.
import "./extensions/functional"; // Registers map, filter, select, etc.
```

### Configuration System
- Format-neutral base with format-specific sections (xml, json, etc.)
- Extension config defaults merged globally via `mergeGlobalDefaults()`
- Path aliases: `@/*` maps to `src/*`, `tests/*` maps to `tests/*`

## Testing Architecture

### Test Structure
- Tests mirror src/ structure in tests/
- Core functionality: `tests/core/`
- Extensions: `tests/extensions/`
- Setup file: `tests/setup.ts` configures Jest environment

### Test Utilities
- Global test timeout: 10 seconds
- Logger level set to ERROR for cleaner test output
- Coverage thresholds: 90% across all metrics

### Running Specific Test Categories
```bash
npm test -- tests/core/          # Core functionality
npm test -- tests/extensions/    # Extension methods
npm test -- tests/transforms/    # Transform functions
```

## File Organization

### Source Structure
```
src/
├── XJFN.ts                 # Main class and extension registration
├── index.ts                # Public API exports with extension imports
├── core/                   # Core functionality (format-neutral)
├── adapters/               # Format-specific converters
├── extensions/             # Extension methods (map, filter, etc.)
└── transforms/             # Pure transform functions
```

### Key Conventions
- Extensions must import to register (side-effect imports)
- Adapters isolated by format in subdirectories
- Transform functions are pure, stateless, and composable
- All public APIs exported through `src/index.ts`

## Development Workflow

### Adding New Extensions
1. Create extension implementation with `ExtensionContext`
2. Register via `XJFN.registerExtension()` with isTerminal flag
3. Add import to `src/index.ts` or appropriate extension file
4. Write comprehensive tests following existing patterns

### Adding New Formats
1. Create adapter directory under `src/adapters/`
2. Implement input/output adapters extending base `Adapter`
3. Register extensions for format (e.g., `fromYaml`, `toYaml`)
4. Add format-specific configuration defaults
5. Add comprehensive round-trip tests

### Configuration Changes
- Core config in `src/core/config.ts`
- Format-specific defaults in adapter registration
- Use `mergeGlobalDefaults()` for extension config defaults