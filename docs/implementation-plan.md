# BTCP Vanilla JS Client - Implementation Plan

This document outlines the implementation plan for a convenience wrapper around the core [`@btcp/client`](https://github.com/browser-tool-calling-protocol/btcp-client) package, providing an ergonomic API for web developers.

---

## Overview

### Philosophy

This package is **not** a reimplementation of BTCP. Instead, it:

1. **Wraps** `@btcp/client` with a developer-friendly API
2. **Provides** CDN-ready distribution (UMD, IIFE)
3. **Simplifies** common patterns (tool registration, connection management)
4. **Enhances** with optional security features (capability checking)

### What `@btcp/client` Already Provides

| Feature | Status |
|---------|--------|
| `BTCPClient` class | ✅ Provided |
| HTTP Streaming transport (SSE + POST) | ✅ Provided |
| `ToolExecutor` for tool handling | ✅ Provided |
| JSON-RPC utilities | ✅ Provided |
| Connection management | ✅ Provided |
| Event system (`on`, `off`) | ✅ Provided |
| Auto-reconnect | ✅ Provided |

### What This Package Adds

| Feature | Status |
|---------|--------|
| `createClient()` factory function | 🆕 New |
| Simplified `registerTool()` with inline handlers | 🆕 New |
| CDN builds (UMD, IIFE, minified) | 🆕 New |
| Capability-based security layer | 🆕 New |

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Phase 1: Project Setup](#2-phase-1-project-setup)
3. [Phase 2: Core Wrapper](#3-phase-2-core-wrapper)
4. [Phase 3: Enhanced Tool Registration](#4-phase-3-enhanced-tool-registration)
5. [Phase 4: Security Layer](#5-phase-4-security-layer)
6. [Phase 5: Build & Distribution](#6-phase-5-build--distribution)
7. [Phase 6: Testing](#7-phase-6-testing)
8. [Phase 7: Documentation](#8-phase-7-documentation)

---

## 1. Project Structure

```
btcp-vanilla-js/
├── src/
│   ├── index.ts                 # Main entry, re-exports + createClient
│   ├── client.ts                # VanillaClient wrapper class
│   ├── types.ts                 # Extended type definitions
│   ├── tools/
│   │   └── registry.ts          # Enhanced tool registry with handlers
│   └── security/
│       └── capabilities.ts      # Optional capability checking
├── dist/                        # Build output
├── tests/
│   ├── unit/
│   └── integration/
├── examples/
├── docs/
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

---

## 2. Phase 1: Project Setup

### 2.1 Package Configuration

```json
{
  "name": "@btcp/vanilla",
  "version": "1.0.0",
  "description": "Convenience wrapper for BTCP client",
  "dependencies": {
    "@btcp/client": "^1.0.0"
  }
}
```

### 2.2 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

---

## 3. Phase 2: Core Wrapper

### 3.1 Type Definitions (`src/types.ts`)

Extend core types with convenience options:

```typescript
// Extended options for createClient
export interface CreateClientOptions {
  serverUrl: string;
  sessionId?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  connectionTimeout?: number;
  debug?: boolean;
  auth?: AuthConfig;
  capabilities?: string[];
}

// Simplified tool definition with inline handler
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: JSONSchema;
  capabilities?: string[];
  handler: (params: unknown) => unknown | Promise<unknown>;
  version?: string;
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
```

### 3.2 Client Wrapper (`src/client.ts`)

Wrapper class that simplifies the core client API with:
- Inline tool handler registration
- Capability-based security checking
- Automatic tool synchronization
- Event forwarding

### 3.3 Factory Function (`src/index.ts`)

```typescript
export function createClient(options: CreateClientOptions): VanillaClient {
  return new VanillaClient(options);
}
```

---

## 4. Phase 3: Enhanced Tool Registration

### 4.1 Tool Registry (`src/tools/registry.ts`)

Enhanced registry that stores handlers with definitions and provides:
- `register(definition)` - Register tool with inline handler
- `unregister(name)` - Remove a tool
- `list()` - List all registered tools
- `toProtocolFormat()` - Convert to server format (without handlers)

---

## 5. Phase 4: Security Layer

### 5.1 Capability Manager (`src/security/capabilities.ts`)

Optional capability-based security:

```typescript
export const CAPABILITIES = {
  DOM_READ: 'dom:read',
  DOM_WRITE: 'dom:write',
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',
  NETWORK_FETCH: 'network:fetch',
  CLIPBOARD_READ: 'clipboard:read',
  CLIPBOARD_WRITE: 'clipboard:write',
} as const;
```

---

## 6. Phase 5: Build & Distribution

### 6.1 Build Outputs

| Format | File | Use Case |
|--------|------|----------|
| ESM | `dist/btcp-vanilla.esm.js` | Modern bundlers |
| CJS | `dist/btcp-vanilla.cjs.js` | Node.js |
| UMD | `dist/btcp-vanilla.umd.js` | Browser global |
| IIFE | `dist/btcp-vanilla.min.js` | CDN / script tag |

---

## 7. Phase 6: Testing

### 7.1 Unit Tests

- `tests/unit/client.test.ts` - VanillaClient wrapper
- `tests/unit/registry.test.ts` - Tool registry
- `tests/unit/capabilities.test.ts` - Capability manager

### 7.2 Integration Tests

- End-to-end with mock server
- Tool registration and invocation
- Reconnection behavior

---

## 8. Phase 7: Documentation

```
docs/
├── quick-start.md           # 5-minute setup guide
├── api-reference.md         # API documentation
└── examples/
    ├── cdn-usage.md         # Script tag usage
    ├── tool-registration.md # Custom tools
    └── capabilities.md      # Security features
```

---

## File Summary

| File | Description | Lines (est.) |
|------|-------------|--------------|
| `src/index.ts` | Main exports, factory | 40 |
| `src/client.ts` | VanillaClient wrapper | 120 |
| `src/types.ts` | Type definitions | 60 |
| `src/tools/registry.ts` | Tool registry | 50 |
| `src/security/capabilities.ts` | Capability manager | 50 |
| **Total** | | **~320** |

---

## Success Criteria

- [ ] `createClient()` works with simple options
- [ ] `registerTool()` accepts inline handlers
- [ ] CDN script tag works out of the box
- [ ] Capability checking prevents unauthorized tool registration
- [ ] All events forwarded correctly from core client
- [ ] Bundle size < 10 KB (minified + gzip, including `@btcp/client`)
- [ ] TypeScript types fully documented
- [ ] 80%+ test coverage on wrapper code
