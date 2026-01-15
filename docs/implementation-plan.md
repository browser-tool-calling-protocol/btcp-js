# BTCP Vanilla JS Client - Implementation Plan

This document outlines the implementation plan for the Browser Tool Calling Protocol (BTCP) vanilla JavaScript client library based on the [spec.md](../spec.md).

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Phase 1: Core Foundation](#2-phase-1-core-foundation)
3. [Phase 2: Transport Layer](#3-phase-2-transport-layer)
4. [Phase 3: Protocol Implementation](#4-phase-3-protocol-implementation)
5. [Phase 4: Tool System](#5-phase-4-tool-system)
6. [Phase 5: Event System](#6-phase-5-event-system)
7. [Phase 6: Security & Validation](#7-phase-6-security--validation)
8. [Phase 7: Build & Distribution](#8-phase-7-build--distribution)
9. [Phase 8: Framework Bindings](#9-phase-8-framework-bindings)
10. [Phase 9: Testing](#10-phase-9-testing)
11. [Phase 10: Documentation](#11-phase-10-documentation)
12. [File Structure Overview](#12-file-structure-overview)

---

## 1. Project Structure

```
btcp-vanilla-js/
├── src/
│   ├── index.ts                 # Main entry point, exports
│   ├── client.ts                # BTCPClient implementation
│   ├── types.ts                 # TypeScript interfaces and types
│   ├── constants.ts             # Error codes, default values
│   ├── transport/
│   │   ├── index.ts             # Transport exports
│   │   ├── base.ts              # Abstract Transport class
│   │   ├── websocket.ts         # WebSocket transport
│   │   └── http-streaming.ts    # SSE + HTTP POST transport
│   ├── protocol/
│   │   ├── index.ts             # Protocol exports
│   │   ├── json-rpc.ts          # JSON-RPC 2.0 message handling
│   │   └── messages.ts          # BTCP-specific message types
│   ├── tools/
│   │   ├── index.ts             # Tool system exports
│   │   ├── registry.ts          # Tool registration and storage
│   │   ├── executor.ts          # Tool execution with timeout
│   │   └── validator.ts         # JSON Schema validation
│   ├── security/
│   │   ├── index.ts             # Security exports
│   │   ├── capabilities.ts      # Capability checking
│   │   └── sanitizer.ts         # Input sanitization
│   ├── events/
│   │   ├── index.ts             # Event exports
│   │   └── emitter.ts           # Event emitter implementation
│   └── utils/
│       ├── index.ts             # Utility exports
│       ├── id-generator.ts      # Unique ID generation
│       └── reconnect.ts         # Exponential backoff logic
├── dist/                        # Build output
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── browser/                 # Browser tests
├── examples/                    # Example implementations
├── docs/                        # Documentation
├── package.json
├── tsconfig.json
├── rollup.config.js             # Build configuration
└── README.md
```

---

## 2. Phase 1: Core Foundation

### 2.1 TypeScript Configuration

Create `tsconfig.json` with strict mode and ES2020 target for modern browser support.

### 2.2 Type Definitions (`src/types.ts`)

Define all TypeScript interfaces:

```typescript
// Client Options
interface BTCPClientOptions {
  serverUrl: string;
  transport?: 'websocket' | 'http-streaming';
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  auth?: AuthConfig;
  metadata?: Record<string, unknown>;
}

// Authentication
interface AuthConfig {
  type: 'bearer' | 'basic' | 'custom';
  token?: string;
  credentials?: { username: string; password: string };
  customHeaders?: Record<string, string>;
}

// Connection Status
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Tool Definition
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: JSONSchema;
  capabilities?: string[];
  handler: (params: unknown) => unknown | Promise<unknown>;
  version?: string;
}

// JSON-RPC Types
interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: JSONRPCError;
  id: string | number | null;
}

interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}
```

### 2.3 Constants (`src/constants.ts`)

Define error codes and default configuration values:

```typescript
// JSON-RPC Standard Error Codes
export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // BTCP Custom Error Codes
  TOOL_NOT_FOUND: -32000,
  TOOL_EXECUTION_ERROR: -32001,
  CAPABILITY_DENIED: -32002,
  TIMEOUT: -32003,
} as const;

// Default Configuration
export const DEFAULTS = {
  TRANSPORT: 'websocket',
  AUTO_RECONNECT: true,
  RECONNECT_INTERVAL: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
  TOOL_TIMEOUT: 30000,
  HEARTBEAT_INTERVAL: 30000,
} as const;

// Capabilities
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

## 3. Phase 2: Transport Layer

### 3.1 Base Transport (`src/transport/base.ts`)

Abstract base class defining the transport interface:

```typescript
abstract class BaseTransport {
  protected url: string;
  protected options: TransportOptions;
  protected messageHandler: ((msg: JSONRPCMessage) => void) | null = null;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: JSONRPCMessage): Promise<void>;
  abstract get isConnected(): boolean;

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandler = handler;
  }
}
```

### 3.2 WebSocket Transport (`src/transport/websocket.ts`)

Primary transport implementation:

**Features to implement:**
- Connection establishment with URL and auth headers
- Automatic ping/pong heartbeat mechanism
- Message queuing when disconnected
- Connection state management
- Error event handling
- Clean disconnect with proper close codes

**Implementation details:**
```typescript
class WebSocketTransport extends BaseTransport {
  private ws: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private messageQueue: JSONRPCMessage[] = [];

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async send(message: JSONRPCMessage): Promise<void>;

  private setupHeartbeat(): void;
  private clearHeartbeat(): void;
  private flushQueue(): void;
}
```

### 3.3 HTTP Streaming Transport (`src/transport/http-streaming.ts`)

Alternative transport for CDN/proxy compatibility:

**Features to implement:**
- SSE (EventSource) for server → client messages
- HTTP POST for client → server messages
- Session token management
- Automatic reconnection for SSE
- Request queuing and batching

**Implementation details:**
```typescript
class HTTPStreamingTransport extends BaseTransport {
  private eventSource: EventSource | null = null;
  private sessionToken: string | null = null;
  private postEndpoint: string;

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async send(message: JSONRPCMessage): Promise<void>;

  private setupSSE(): void;
  private post(message: JSONRPCMessage): Promise<void>;
}
```

---

## 4. Phase 3: Protocol Implementation

### 4.1 JSON-RPC Handler (`src/protocol/json-rpc.ts`)

Core JSON-RPC 2.0 message handling:

```typescript
class JSONRPCHandler {
  private pendingRequests: Map<string | number, PendingRequest>;
  private requestTimeout: number;

  // Create request messages
  createRequest(method: string, params?: unknown): JSONRPCRequest;
  createNotification(method: string, params?: unknown): JSONRPCRequest;

  // Create response messages
  createResponse(id: string | number, result: unknown): JSONRPCResponse;
  createErrorResponse(id: string | number, error: JSONRPCError): JSONRPCResponse;

  // Handle incoming messages
  handleMessage(message: JSONRPCMessage): void;

  // Wait for response
  waitForResponse(id: string | number): Promise<JSONRPCResponse>;

  // ID generation
  private generateId(): string;
}
```

### 4.2 BTCP Messages (`src/protocol/messages.ts`)

BTCP-specific message builders:

```typescript
// Tool registration message
function createToolsRegisterMessage(tools: ToolDefinition[]): JSONRPCRequest;

// Tool list request
function createToolsListMessage(): JSONRPCRequest;

// Tool result response
function createToolResultMessage(id: string, result: unknown): JSONRPCResponse;

// Tool error response
function createToolErrorMessage(id: string, error: JSONRPCError): JSONRPCResponse;

// Parse incoming tool call
function parseToolCallMessage(message: JSONRPCRequest): ToolCallParams;
```

---

## 5. Phase 4: Tool System

### 5.1 Tool Registry (`src/tools/registry.ts`)

Manages registered tools:

```typescript
class ToolRegistry {
  private tools: Map<string, ToolDefinition>;

  register(definition: ToolDefinition): void;
  unregister(name: string): boolean;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  has(name: string): boolean;
  clear(): void;

  // Get tools as protocol format (without handlers)
  toProtocolFormat(): ProtocolToolDefinition[];
}
```

### 5.2 Tool Executor (`src/tools/executor.ts`)

Handles tool execution with timeout and error handling:

```typescript
class ToolExecutor {
  private timeout: number;

  async execute(
    tool: ToolDefinition,
    params: unknown
  ): Promise<ToolExecutionResult>;

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<T>;

  private wrapResult(result: unknown): ToolResultContent[];
}
```

### 5.3 Input Validator (`src/tools/validator.ts`)

JSON Schema validation for tool inputs:

```typescript
class InputValidator {
  validate(schema: JSONSchema, data: unknown): ValidationResult;

  private validateType(schema: JSONSchema, data: unknown): boolean;
  private validateObject(schema: JSONSchema, data: unknown): ValidationError[];
  private validateArray(schema: JSONSchema, data: unknown): ValidationError[];
  private validateString(schema: JSONSchema, data: unknown): ValidationError[];
  private validateNumber(schema: JSONSchema, data: unknown): ValidationError[];
}
```

**Note:** Implement a minimal JSON Schema validator to avoid external dependencies. Support:
- `type` validation (string, number, boolean, object, array, null)
- `required` properties
- `properties` for objects
- `items` for arrays
- `enum` values
- `minLength`, `maxLength` for strings
- `minimum`, `maximum` for numbers

---

## 6. Phase 5: Event System

### 6.1 Event Emitter (`src/events/emitter.ts`)

Type-safe event emitter implementation:

```typescript
type EventHandler<T = unknown> = (payload: T) => void;
type Unsubscribe = () => void;

class EventEmitter<TEvents extends Record<string, unknown>> {
  private handlers: Map<keyof TEvents, Set<EventHandler>>;

  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe;

  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void;

  emit<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K]
  ): void;

  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe;

  removeAllListeners(event?: keyof TEvents): void;
}
```

### 6.2 BTCP Events (`src/events/index.ts`)

Define event types for the client:

```typescript
interface BTCPEventPayloads {
  connect: { sessionId: string };
  disconnect: { reason: string; code: number };
  reconnect: { attempt: number };
  error: { error: Error; context?: string };
  'tool:call': { name: string; params: unknown; id: string };
  'tool:result': { name: string; result: unknown; id: string };
  message: JSONRPCMessage;
}

type BTCPEvent = keyof BTCPEventPayloads;
```

---

## 7. Phase 6: Security & Validation

### 7.1 Capability Manager (`src/security/capabilities.ts`)

Manages and validates tool capabilities:

```typescript
class CapabilityManager {
  private grantedCapabilities: Set<string>;

  grant(capability: string): void;
  revoke(capability: string): void;
  has(capability: string): boolean;

  checkTool(tool: ToolDefinition): CapabilityCheckResult;
  listGranted(): string[];
  clear(): void;
}

interface CapabilityCheckResult {
  allowed: boolean;
  missing: string[];
}
```

### 7.2 Input Sanitizer (`src/security/sanitizer.ts`)

Sanitize inputs before DOM operations:

```typescript
class Sanitizer {
  // Sanitize string for safe DOM insertion
  static sanitizeHTML(input: string): string;

  // Sanitize CSS selector
  static sanitizeSelector(selector: string): string;

  // Validate URL
  static isValidURL(url: string): boolean;

  // Check for dangerous patterns
  static hasDangerousPatterns(input: string): boolean;
}
```

---

## 8. Phase 7: Build & Distribution

### 8.1 Build Configuration

**Rollup Configuration (`rollup.config.js`):**

```javascript
// Build targets:
// 1. UMD - Browser global (BTCP.createClient)
// 2. ESM - ES modules for bundlers
// 3. CJS - CommonJS for Node.js
// 4. IIFE - Minified for direct script tag

export default [
  // UMD Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-client.umd.js',
      format: 'umd',
      name: 'BTCP',
    },
  },
  // ESM Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-client.esm.js',
      format: 'esm',
    },
  },
  // CJS Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-client.cjs.js',
      format: 'cjs',
    },
  },
  // IIFE Minified
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/btcp-client.min.js',
      format: 'iife',
      name: 'BTCP',
    },
    plugins: [terser()],
  },
];
```

### 8.2 Package Configuration

**package.json exports:**

```json
{
  "name": "@btcp/client",
  "version": "1.0.0",
  "main": "dist/btcp-client.cjs.js",
  "module": "dist/btcp-client.esm.js",
  "browser": "dist/btcp-client.umd.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/btcp-client.esm.js",
      "require": "./dist/btcp-client.cjs.js",
      "browser": "./dist/btcp-client.umd.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

### 8.3 Bundle Size Strategy

Target: < 5 KB (minified + gzip) for core

**Strategies:**
- No external dependencies
- Tree-shaking friendly exports
- Optional transport loading
- Minimal JSON Schema validator

---

## 9. Phase 8: Framework Bindings

### 9.1 React Bindings (`packages/react/`)

**Structure:**
```
packages/react/
├── src/
│   ├── index.ts
│   ├── BTCPProvider.tsx
│   ├── useBTCPClient.ts
│   └── useToolResult.ts
├── package.json
└── tsconfig.json
```

**Implementation:**

```typescript
// BTCPProvider.tsx
const BTCPContext = createContext<BTCPContextValue | null>(null);

export function BTCPProvider({
  serverUrl,
  options,
  children,
}: BTCPProviderProps) {
  const clientRef = useRef<BTCPClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    clientRef.current = createClient({ serverUrl, ...options });
    // Setup event listeners
    // Connect on mount, disconnect on unmount
  }, []);

  return (
    <BTCPContext.Provider value={{ client: clientRef.current, status }}>
      {children}
    </BTCPContext.Provider>
  );
}

// useBTCPClient.ts
export function useBTCPClient() {
  const context = useContext(BTCPContext);
  if (!context) throw new Error('useBTCPClient must be used within BTCPProvider');

  return {
    client: context.client,
    status: context.status,
    registerTool: (def) => context.client?.registerTool(def),
    tools: context.client?.listTools() ?? [],
  };
}
```

### 9.2 Vue Bindings (`packages/vue/`)

**Structure:**
```
packages/vue/
├── src/
│   ├── index.ts
│   ├── useBTCP.ts
│   └── plugin.ts
├── package.json
└── tsconfig.json
```

**Implementation:**

```typescript
// useBTCP.ts
export function useBTCP(options: BTCPClientOptions) {
  const client = ref<BTCPClient | null>(null);
  const status = ref<ConnectionStatus>('disconnected');
  const tools = ref<ToolDefinition[]>([]);

  onMounted(() => {
    client.value = createClient(options);
    // Setup reactive bindings
  });

  onUnmounted(() => {
    client.value?.destroy();
  });

  return {
    client: readonly(client),
    status: readonly(status),
    tools: readonly(tools),
    registerTool: (def) => {
      client.value?.registerTool(def);
      tools.value = client.value?.listTools() ?? [];
    },
  };
}
```

---

## 10. Phase 9: Testing

### 10.1 Unit Tests (`tests/unit/`)

**Test files:**
- `transport/websocket.test.ts` - WebSocket transport
- `transport/http-streaming.test.ts` - HTTP streaming transport
- `protocol/json-rpc.test.ts` - JSON-RPC message handling
- `tools/registry.test.ts` - Tool registration
- `tools/executor.test.ts` - Tool execution
- `tools/validator.test.ts` - Input validation
- `events/emitter.test.ts` - Event system
- `client.test.ts` - Main client

### 10.2 Integration Tests (`tests/integration/`)

**Test scenarios:**
- Full connection lifecycle
- Tool registration and invocation
- Multiple concurrent tool calls
- Reconnection behavior
- Error handling and recovery
- Authentication flows

**Mock Server:**
Create a mock BTCP server for integration testing:

```typescript
// tests/mocks/btcp-server.ts
class MockBTCPServer {
  private wss: WebSocketServer;
  private sessions: Map<string, MockSession>;

  constructor(port: number);
  simulateToolCall(sessionId: string, toolName: string, params: unknown): void;
  getRegisteredTools(sessionId: string): ToolDefinition[];
  close(): Promise<void>;
}
```

### 10.3 Browser Tests (`tests/browser/`)

**Playwright/Cypress tests for:**
- Chrome, Firefox, Safari, Edge compatibility
- CDN script loading
- Memory leak detection
- Real WebSocket connections
- Real SSE connections

---

## 11. Phase 10: Documentation

### 11.1 Documentation Structure

```
docs/
├── quick-start.md          # 5-minute integration guide
├── api-reference.md        # Full TypeScript API docs
├── protocol-guide.md       # JSON-RPC message formats
├── security-guide.md       # Capabilities and best practices
├── framework-guides/
│   ├── react.md
│   ├── vue.md
│   └── svelte.md
├── examples/
│   ├── basic-usage.md
│   ├── custom-tools.md
│   └── authentication.md
└── migration/
    └── v1-to-v2.md
```

### 11.2 API Documentation

Generate TypeDoc documentation from TypeScript source.

---

## 12. File Structure Overview

### Complete Source Files

| File | Description | Lines (est.) |
|------|-------------|--------------|
| `src/index.ts` | Main exports | 30 |
| `src/client.ts` | BTCPClient class | 250 |
| `src/types.ts` | Type definitions | 150 |
| `src/constants.ts` | Constants | 50 |
| `src/transport/base.ts` | Base transport | 50 |
| `src/transport/websocket.ts` | WebSocket transport | 200 |
| `src/transport/http-streaming.ts` | HTTP streaming | 180 |
| `src/protocol/json-rpc.ts` | JSON-RPC handler | 150 |
| `src/protocol/messages.ts` | Message builders | 80 |
| `src/tools/registry.ts` | Tool registry | 80 |
| `src/tools/executor.ts` | Tool executor | 100 |
| `src/tools/validator.ts` | JSON Schema validator | 200 |
| `src/security/capabilities.ts` | Capability manager | 60 |
| `src/security/sanitizer.ts` | Input sanitizer | 80 |
| `src/events/emitter.ts` | Event emitter | 80 |
| `src/utils/id-generator.ts` | ID generation | 20 |
| `src/utils/reconnect.ts` | Reconnection logic | 50 |
| **Total** | | **~1,810** |

---

## Implementation Order

### Recommended Sequence

1. **Foundation**
   - Set up project structure
   - Configure TypeScript
   - Define types and constants

2. **Core Infrastructure**
   - Event emitter
   - Utility functions (ID generation, reconnect)
   - JSON-RPC handler

3. **Transport Layer**
   - Base transport class
   - WebSocket transport
   - HTTP streaming transport

4. **Tool System**
   - Tool registry
   - Input validator
   - Tool executor

5. **Security**
   - Capability manager
   - Input sanitizer

6. **Client Assembly**
   - BTCPClient class
   - Integration of all components
   - Main exports

7. **Build Setup**
   - Rollup configuration
   - Package.json setup
   - TypeScript declaration generation

8. **Testing**
   - Unit tests
   - Integration tests
   - Browser tests

9. **Framework Bindings**
   - React package
   - Vue package

10. **Documentation**
    - Quick start guide
    - API reference
    - Examples

---

## Success Criteria

- [ ] All TypeScript interfaces match spec exactly
- [ ] Core bundle < 5 KB (minified + gzip)
- [ ] Full bundle < 10 KB (minified + gzip)
- [ ] Zero external dependencies
- [ ] 90%+ test coverage
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] CDN script tag works out of the box
- [ ] React and Vue bindings functional
- [ ] All JSON-RPC 2.0 error codes implemented
- [ ] Capability-based security functional
- [ ] Automatic reconnection working
- [ ] Documentation complete
