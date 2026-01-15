# BTCP Vanilla JS Client - Implementation Plan

This document outlines the implementation plan for a convenience wrapper around the core [`@btcp/client`](https://github.com/browser-tool-calling-protocol/btcp-client) package, providing an ergonomic API for web developers and framework bindings.

---

## Overview

### Philosophy

This package is **not** a reimplementation of BTCP. Instead, it:

1. **Wraps** `@btcp/client` with a developer-friendly API
2. **Provides** CDN-ready distribution (UMD, IIFE)
3. **Adds** React and Vue framework bindings
4. **Simplifies** common patterns (tool registration, connection management)
5. **Enhances** with optional security features (capability checking)

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
| React bindings (`BTCPProvider`, `useBTCPClient`) | 🆕 New |
| Vue bindings (`useBTCP`, plugin) | 🆕 New |
| Capability-based security layer | 🆕 New |
| WebSocket transport option | 🆕 New (optional) |

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Phase 1: Project Setup](#2-phase-1-project-setup)
3. [Phase 2: Core Wrapper](#3-phase-2-core-wrapper)
4. [Phase 3: Enhanced Tool Registration](#4-phase-3-enhanced-tool-registration)
5. [Phase 4: Security Layer](#5-phase-4-security-layer)
6. [Phase 5: Build & Distribution](#6-phase-5-build--distribution)
7. [Phase 6: Framework Bindings](#7-phase-6-framework-bindings)
8. [Phase 7: Testing](#8-phase-7-testing)
9. [Phase 8: Documentation](#9-phase-8-documentation)
10. [Implementation Order](#10-implementation-order)

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
│   ├── security/
│   │   └── capabilities.ts      # Optional capability checking
│   └── utils/
│       └── helpers.ts           # Utility functions
├── packages/
│   ├── react/                   # @btcp/react bindings
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── BTCPProvider.tsx
│   │   │   ├── useBTCPClient.ts
│   │   │   └── useToolResult.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── vue/                     # @btcp/vue bindings
│       ├── src/
│       │   ├── index.ts
│       │   ├── useBTCP.ts
│       │   └── plugin.ts
│       ├── package.json
│       └── tsconfig.json
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
  "description": "Convenience wrapper for BTCP client with framework bindings",
  "dependencies": {
    "@btcp/client": "^1.0.0"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "vue": ">=3.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "vue": { "optional": true }
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
import type { BTCPClient as CoreClient } from '@btcp/client';

// Extended options for createClient
export interface CreateClientOptions {
  /** BTCP server URL */
  serverUrl: string;

  /** Session ID (optional, auto-generated if not provided) */
  sessionId?: string;

  /** Enable auto-reconnect (default: true) */
  autoReconnect?: boolean;

  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;

  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;

  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Authentication config */
  auth?: AuthConfig;

  /** Granted capabilities for security layer */
  capabilities?: string[];
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'custom';
  token?: string;
  credentials?: { username: string; password: string };
  headers?: Record<string, string>;
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

// Event types
export type BTCPEvent =
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'error'
  | 'tool:call'
  | 'tool:result'
  | 'message';
```

### 3.2 Client Wrapper (`src/client.ts`)

Wrapper class that simplifies the core client API:

```typescript
import { BTCPClient as CoreClient, ToolExecutor } from '@btcp/client';
import type { CreateClientOptions, ToolDefinition, ConnectionStatus, BTCPEvent } from './types';
import { ToolRegistry } from './tools/registry';
import { CapabilityManager } from './security/capabilities';

export class VanillaClient {
  private core: CoreClient;
  private executor: ToolExecutor;
  private registry: ToolRegistry;
  private capabilities: CapabilityManager;
  private _status: ConnectionStatus = 'disconnected';

  constructor(options: CreateClientOptions) {
    // Initialize core client
    this.core = new CoreClient({
      serverUrl: options.serverUrl,
      sessionId: options.sessionId,
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      connectionTimeout: options.connectionTimeout ?? 10000,
      debug: options.debug ?? false,
    });

    this.executor = this.core.getExecutor();
    this.registry = new ToolRegistry();
    this.capabilities = new CapabilityManager(options.capabilities);

    this.setupEventForwarding();
  }

  /** Connect to the BTCP server */
  async connect(): Promise<void> {
    this._status = 'connecting';
    await this.core.connect();
    // Register all tools with the server
    await this.syncTools();
    this._status = 'connected';
  }

  /** Disconnect from the server */
  async disconnect(): Promise<void> {
    await this.core.disconnect();
    this._status = 'disconnected';
  }

  /** Current connection status */
  get status(): ConnectionStatus {
    return this._status;
  }

  /** Session ID */
  get sessionId(): string | undefined {
    return this.core.getSessionId();
  }

  /** Register a tool with inline handler */
  registerTool(definition: ToolDefinition): void {
    // Check capabilities
    if (definition.capabilities) {
      const check = this.capabilities.check(definition.capabilities);
      if (!check.allowed) {
        throw new Error(`Missing capabilities: ${check.missing.join(', ')}`);
      }
    }

    // Store in registry
    this.registry.register(definition);

    // Register handler with executor
    this.executor.registerHandler(definition.name, async (params) => {
      return definition.handler(params);
    });

    // If connected, sync with server
    if (this.core.isConnected()) {
      this.syncTools();
    }
  }

  /** Unregister a tool */
  unregisterTool(name: string): void {
    this.registry.unregister(name);
    // Note: Core client may not support unregistration - tools list update on next sync
  }

  /** List registered tools */
  listTools(): ToolDefinition[] {
    return this.registry.list();
  }

  /** Subscribe to events */
  on(event: BTCPEvent, handler: (payload: unknown) => void): () => void {
    this.core.on(event, handler);
    return () => this.core.off(event, handler);
  }

  /** Unsubscribe from events */
  off(event: BTCPEvent, handler: (payload: unknown) => void): void {
    this.core.off(event, handler);
  }

  /** Access the underlying core client */
  get coreClient(): CoreClient {
    return this.core;
  }

  /** Cleanup and destroy */
  destroy(): void {
    this.disconnect();
    this.registry.clear();
    this.capabilities.clear();
  }

  private async syncTools(): Promise<void> {
    const definitions = this.registry.toProtocolFormat();
    await this.core.registerTools(definitions);
  }

  private setupEventForwarding(): void {
    // Forward status changes
    this.core.on('connect', () => { this._status = 'connected'; });
    this.core.on('disconnect', () => { this._status = 'disconnected'; });
    this.core.on('reconnect', () => { this._status = 'reconnecting'; });
  }
}
```

### 3.3 Factory Function (`src/index.ts`)

Main entry point with `createClient` factory:

```typescript
import { VanillaClient } from './client';
import type { CreateClientOptions, ToolDefinition } from './types';

// Re-export core utilities
export {
  createRequest,
  createResponse,
  createTextContent,
  createImageContent,
  parseMessage,
  serializeMessage
} from '@btcp/client';

// Re-export types
export type {
  CreateClientOptions,
  ToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  AuthConfig
} from './types';

// Main factory function
export function createClient(options: CreateClientOptions): VanillaClient {
  return new VanillaClient(options);
}

// Export class for advanced usage
export { VanillaClient };

// Default export for CDN usage
export default { createClient };
```

---

## 4. Phase 3: Enhanced Tool Registration

### 4.1 Tool Registry (`src/tools/registry.ts`)

Enhanced registry that stores handlers with definitions:

```typescript
import type { ToolDefinition } from '../types';

export interface ProtocolToolDefinition {
  name: string;
  description: string;
  inputSchema?: unknown;
  capabilities?: string[];
  version?: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(definition: ToolDefinition): void {
    if (this.tools.has(definition.name)) {
      console.warn(`Tool "${definition.name}" is being overwritten`);
    }
    this.tools.set(definition.name, definition);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  /** Convert to protocol format (without handlers) */
  toProtocolFormat(): ProtocolToolDefinition[] {
    return this.list().map(({ handler, ...rest }) => rest);
  }
}
```

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

export interface CapabilityCheckResult {
  allowed: boolean;
  missing: string[];
}

export class CapabilityManager {
  private granted: Set<string>;

  constructor(capabilities?: string[]) {
    this.granted = new Set(capabilities ?? Object.values(CAPABILITIES));
  }

  grant(capability: string): void {
    this.granted.add(capability);
  }

  revoke(capability: string): void {
    this.granted.delete(capability);
  }

  has(capability: string): boolean {
    return this.granted.has(capability);
  }

  check(required: string[]): CapabilityCheckResult {
    const missing = required.filter(cap => !this.granted.has(cap));
    return {
      allowed: missing.length === 0,
      missing,
    };
  }

  listGranted(): string[] {
    return Array.from(this.granted);
  }

  clear(): void {
    this.granted.clear();
  }
}
```

---

## 6. Phase 5: Build & Distribution

### 6.1 Rollup Configuration

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const external = ['@btcp/client'];

export default [
  // ESM build (for bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [typescript(), resolve(), commonjs()],
  },

  // CJS build (for Node.js)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    external,
    plugins: [typescript(), resolve(), commonjs()],
  },

  // UMD build (for browsers, includes @btcp/client)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.umd.js',
      format: 'umd',
      name: 'BTCP',
      sourcemap: true,
      globals: {},
    },
    plugins: [typescript(), resolve(), commonjs()],
  },

  // IIFE minified (for CDN)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-vanilla.min.js',
      format: 'iife',
      name: 'BTCP',
      sourcemap: true,
    },
    plugins: [typescript(), resolve(), commonjs(), terser()],
  },
];
```

### 6.2 Package Exports

```json
{
  "main": "dist/btcp-vanilla.cjs.js",
  "module": "dist/btcp-vanilla.esm.js",
  "browser": "dist/btcp-vanilla.umd.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/btcp-vanilla.esm.js",
      "require": "./dist/btcp-vanilla.cjs.js",
      "browser": "./dist/btcp-vanilla.umd.js",
      "types": "./dist/index.d.ts"
    }
  },
  "unpkg": "dist/btcp-vanilla.min.js",
  "jsdelivr": "dist/btcp-vanilla.min.js"
}
```

---

## 7. Phase 6: Framework Bindings

### 7.1 React Bindings (`packages/react/`)

#### Provider Component

```typescript
// packages/react/src/BTCPProvider.tsx
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { createClient, VanillaClient, CreateClientOptions, ConnectionStatus } from '@btcp/vanilla';

interface BTCPContextValue {
  client: VanillaClient | null;
  status: ConnectionStatus;
}

const BTCPContext = createContext<BTCPContextValue | null>(null);

export interface BTCPProviderProps {
  serverUrl: string;
  options?: Omit<CreateClientOptions, 'serverUrl'>;
  children: React.ReactNode;
  autoConnect?: boolean;
}

export function BTCPProvider({
  serverUrl,
  options,
  children,
  autoConnect = true
}: BTCPProviderProps) {
  const clientRef = useRef<VanillaClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const client = createClient({ serverUrl, ...options });
    clientRef.current = client;

    client.on('connect', () => setStatus('connected'));
    client.on('disconnect', () => setStatus('disconnected'));
    client.on('reconnect', () => setStatus('reconnecting'));

    if (autoConnect) {
      setStatus('connecting');
      client.connect();
    }

    return () => {
      client.destroy();
    };
  }, [serverUrl]);

  return (
    <BTCPContext.Provider value={{ client: clientRef.current, status }}>
      {children}
    </BTCPContext.Provider>
  );
}

export function useBTCPContext(): BTCPContextValue {
  const context = useContext(BTCPContext);
  if (!context) {
    throw new Error('useBTCPContext must be used within BTCPProvider');
  }
  return context;
}
```

#### Client Hook

```typescript
// packages/react/src/useBTCPClient.ts
import { useCallback } from 'react';
import { useBTCPContext } from './BTCPProvider';
import type { ToolDefinition } from '@btcp/vanilla';

export function useBTCPClient() {
  const { client, status } = useBTCPContext();

  const registerTool = useCallback((definition: ToolDefinition) => {
    client?.registerTool(definition);
  }, [client]);

  const unregisterTool = useCallback((name: string) => {
    client?.unregisterTool(name);
  }, [client]);

  return {
    client,
    status,
    isConnected: status === 'connected',
    registerTool,
    unregisterTool,
    tools: client?.listTools() ?? [],
  };
}
```

### 7.2 Vue Bindings (`packages/vue/`)

#### Composable

```typescript
// packages/vue/src/useBTCP.ts
import { ref, readonly, onMounted, onUnmounted, Ref } from 'vue';
import { createClient, VanillaClient, CreateClientOptions, ConnectionStatus, ToolDefinition } from '@btcp/vanilla';

export function useBTCP(options: CreateClientOptions) {
  const client = ref<VanillaClient | null>(null);
  const status = ref<ConnectionStatus>('disconnected');
  const tools = ref<ToolDefinition[]>([]);

  onMounted(async () => {
    const instance = createClient(options);
    client.value = instance;

    instance.on('connect', () => { status.value = 'connected'; });
    instance.on('disconnect', () => { status.value = 'disconnected'; });
    instance.on('reconnect', () => { status.value = 'reconnecting'; });

    status.value = 'connecting';
    await instance.connect();
  });

  onUnmounted(() => {
    client.value?.destroy();
  });

  const registerTool = (definition: ToolDefinition) => {
    client.value?.registerTool(definition);
    tools.value = client.value?.listTools() ?? [];
  };

  const unregisterTool = (name: string) => {
    client.value?.unregisterTool(name);
    tools.value = client.value?.listTools() ?? [];
  };

  return {
    client: readonly(client) as Readonly<Ref<VanillaClient | null>>,
    status: readonly(status),
    tools: readonly(tools),
    isConnected: () => status.value === 'connected',
    registerTool,
    unregisterTool,
  };
}
```

#### Plugin

```typescript
// packages/vue/src/plugin.ts
import type { App } from 'vue';
import type { CreateClientOptions } from '@btcp/vanilla';
import { useBTCP } from './useBTCP';

export const BTCPPlugin = {
  install(app: App, options: CreateClientOptions) {
    const btcp = useBTCP(options);
    app.provide('btcp', btcp);
    app.config.globalProperties.$btcp = btcp;
  },
};
```

---

## 8. Phase 7: Testing

### 8.1 Unit Tests

**Files:**
- `tests/unit/client.test.ts` - VanillaClient wrapper
- `tests/unit/registry.test.ts` - Tool registry
- `tests/unit/capabilities.test.ts` - Capability manager

**Focus areas:**
- Correct delegation to `@btcp/client`
- Tool registration with handlers
- Capability checking
- Event forwarding

### 8.2 Integration Tests

**Scenarios:**
- End-to-end with mock server
- Tool registration and invocation
- Reconnection behavior
- Framework bindings (React, Vue)

---

## 9. Phase 8: Documentation

### 9.1 Documentation Structure

```
docs/
├── quick-start.md           # 5-minute setup guide
├── api-reference.md         # API documentation
├── framework-guides/
│   ├── react.md             # React integration
│   └── vue.md               # Vue integration
├── examples/
│   ├── cdn-usage.md         # Script tag usage
│   ├── tool-registration.md # Custom tools
│   └── capabilities.md      # Security features
└── migration/
    └── from-core.md         # Migrating from @btcp/client
```

---

## 10. Implementation Order

### Recommended Sequence

1. **Project Setup**
   - Initialize package with `@btcp/client` dependency
   - Configure TypeScript
   - Set up build tooling

2. **Core Wrapper**
   - Implement `VanillaClient` class
   - Create `createClient` factory
   - Set up re-exports from core

3. **Tool System**
   - Implement `ToolRegistry`
   - Wire up handler registration with `ToolExecutor`

4. **Security Layer**
   - Implement `CapabilityManager`
   - Integrate with tool registration

5. **Build Configuration**
   - Configure Rollup for all output formats
   - Set up package exports
   - Generate type declarations

6. **Framework Bindings**
   - React package (`@btcp/react`)
   - Vue package (`@btcp/vue`)

7. **Testing**
   - Unit tests
   - Integration tests

8. **Documentation**
   - Quick start guide
   - API reference
   - Examples

---

## File Summary

| File | Description | Lines (est.) |
|------|-------------|--------------|
| `src/index.ts` | Main exports, factory | 40 |
| `src/client.ts` | VanillaClient wrapper | 120 |
| `src/types.ts` | Type definitions | 60 |
| `src/tools/registry.ts` | Tool registry | 50 |
| `src/security/capabilities.ts` | Capability manager | 50 |
| `packages/react/src/*` | React bindings | 100 |
| `packages/vue/src/*` | Vue bindings | 80 |
| **Total** | | **~500** |

---

## Success Criteria

- [ ] `createClient()` works with simple options
- [ ] `registerTool()` accepts inline handlers
- [ ] CDN script tag works out of the box
- [ ] React `BTCPProvider` and `useBTCPClient` functional
- [ ] Vue `useBTCP` composable functional
- [ ] Capability checking prevents unauthorized tool registration
- [ ] All events forwarded correctly from core client
- [ ] Bundle size < 15 KB (minified + gzip, including `@btcp/client`)
- [ ] TypeScript types fully documented
- [ ] 80%+ test coverage on wrapper code
