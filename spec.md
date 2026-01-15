# BTCP Client Interface Specification

## Overview

This document specifies the requirements for a low-level Browser Tool Calling Protocol (BTCP) client interface designed for seamless integration into any web application. The client serves as a foundational layer enabling AI agents to discover and invoke browser-based tools through a standardized protocol.

## Goals

1. **Minimal footprint** - Lightweight, dependency-free core suitable for CDN distribution
2. **Framework agnostic** - Works as a standalone library or as a foundation for React, Vue, and other framework bindings
3. **Protocol compliant** - Full compliance with [BTCP Specification](https://github.com/browser-tool-calling-protocol/btcp-specification)
4. **Developer ergonomic** - Simple API surface for rapid adoption
5. **Extensible** - Plugin architecture for custom transports and tool handlers

---

## Target Users

- **Web developers** building browser-based AI assistants with chat interfaces
- **Framework authors** creating React/Vue/Svelte bindings
- **Extension developers** exposing browser capabilities to AI agents
- **Platform builders** integrating BTCP into existing agent infrastructure

---

## Use Cases

### 1. CDN Script Tag (Zero-Build Setup)

```html
<script src="https://cdn.btcp.dev/client.min.js"></script>
<script>
  const client = BTCP.createClient({
    serverUrl: 'https://your-btcp-server.com'
  });

  client.registerTool({
    name: 'get_page_title',
    description: 'Returns the current page title',
    handler: () => document.title
  });

  client.connect();
</script>
```

### 2. ES Module / Bundler Import

```javascript
import { createClient } from '@btcp/client';

const client = createClient({
  serverUrl: 'wss://your-btcp-server.com',
  autoReconnect: true
});

client.registerTool({
  name: 'search_dom',
  description: 'Search for elements matching a CSS selector',
  inputSchema: {
    type: 'object',
    properties: {
      selector: { type: 'string' }
    },
    required: ['selector']
  },
  handler: ({ selector }) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => el.outerHTML);
  }
});
```

### 3. React Integration

```jsx
import { useBTCPClient, BTCPProvider } from '@btcp/react';

function App() {
  return (
    <BTCPProvider serverUrl="wss://your-server.com">
      <ChatInterface />
    </BTCPProvider>
  );
}

function ChatInterface() {
  const { registerTool, status, lastMessage } = useBTCPClient();

  useEffect(() => {
    registerTool({
      name: 'get_form_data',
      handler: () => new FormData(document.querySelector('form'))
    });
  }, []);

  return <div>Status: {status}</div>;
}
```

### 4. Vue Integration

```vue
<script setup>
import { useBTCP } from '@btcp/vue';

const { client, status, registerTool } = useBTCP({
  serverUrl: 'wss://your-server.com'
});

registerTool({
  name: 'get_vue_state',
  handler: () => ({ /* reactive state */ })
});
</script>
```

### 5. Custom Server Agent Client

```javascript
const client = createClient({
  serverUrl: 'https://my-custom-agent.com/btcp',
  transport: 'http-streaming', // SSE + POST
  auth: {
    type: 'bearer',
    token: 'your-api-key'
  }
});

// Act as tool provider for a custom AI agent
client.onToolCall((toolName, params) => {
  console.log(`Agent called: ${toolName}`, params);
});
```

### 6. MCP Server Bridge

```javascript
import { createClient, MCPBridge } from '@btcp/client';

const client = createClient({
  serverUrl: 'wss://btcp-server.com'
});

// Connect to MCP-compatible server
const mcpBridge = new MCPBridge({
  mcpEndpoint: 'https://mcp-server.com',
  btcpClient: client
});

// Browser tools now accessible via MCP protocol
mcpBridge.expose();
```

---

## Core API Requirements

### Client Factory

```typescript
interface BTCPClientOptions {
  /** BTCP server URL (WebSocket or HTTP) */
  serverUrl: string;

  /** Transport protocol: 'websocket' | 'http-streaming' */
  transport?: 'websocket' | 'http-streaming';

  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;

  /** Reconnect interval in ms */
  reconnectInterval?: number;

  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;

  /** Authentication configuration */
  auth?: AuthConfig;

  /** Client metadata sent on connection */
  metadata?: Record<string, unknown>;
}

function createClient(options: BTCPClientOptions): BTCPClient;
```

### Client Interface

```typescript
interface BTCPClient {
  /** Connection lifecycle */
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** Current connection status */
  readonly status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

  /** Tool registration */
  registerTool(definition: ToolDefinition): void;
  unregisterTool(name: string): void;
  listTools(): ToolDefinition[];

  /** Event handling */
  on(event: BTCPEvent, handler: EventHandler): Unsubscribe;
  off(event: BTCPEvent, handler: EventHandler): void;

  /** Raw message handling (advanced) */
  send(message: JSONRPCMessage): Promise<JSONRPCResponse>;

  /** Destroy client and cleanup */
  destroy(): void;
}
```

### Tool Definition

```typescript
interface ToolDefinition {
  /** Unique tool identifier */
  name: string;

  /** Human-readable description for AI agents */
  description: string;

  /** JSON Schema for input validation */
  inputSchema?: JSONSchema;

  /** Required browser capabilities */
  capabilities?: string[];

  /** Tool execution handler */
  handler: (params: unknown) => unknown | Promise<unknown>;

  /** Tool version (semver) */
  version?: string;
}
```

### Events

```typescript
type BTCPEvent =
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'error'
  | 'tool:call'
  | 'tool:result'
  | 'message';

interface BTCPEventPayloads {
  connect: { sessionId: string };
  disconnect: { reason: string; code: number };
  reconnect: { attempt: number };
  error: { error: Error; context?: string };
  'tool:call': { name: string; params: unknown; id: string };
  'tool:result': { name: string; result: unknown; id: string };
  message: JSONRPCMessage;
}
```

---

## Transport Layer Requirements

### WebSocket Transport (Primary)

- Full-duplex communication
- JSON-RPC 2.0 message framing
- Automatic ping/pong heartbeat
- Reconnection with exponential backoff

### HTTP Streaming Transport (Alternative)

- Server-Sent Events (SSE) for server → client
- HTTP POST for client → server
- Better compatibility with CDNs and proxies
- Session persistence via tokens

### Transport Interface

```typescript
interface Transport {
  connect(url: string, options: TransportOptions): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  readonly isConnected: boolean;
}
```

---

## Protocol Messages (JSON-RPC 2.0)

### Tool Registration

```json
{
  "jsonrpc": "2.0",
  "method": "tools/register",
  "params": {
    "tools": [
      {
        "name": "get_page_title",
        "description": "Returns the current page title",
        "inputSchema": {},
        "capabilities": ["dom:read"]
      }
    ]
  },
  "id": 1
}
```

### Tool Invocation (Server → Client)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_page_title",
    "arguments": {}
  },
  "id": "call-123"
}
```

### Tool Result (Client → Server)

```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "My Page Title"
      }
    ]
  },
  "id": "call-123"
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": { "field": "selector", "reason": "required" }
  },
  "id": "call-123"
}
```

---

## Security Requirements

### Capability-Based Permissions

Tools must declare required capabilities:

| Capability | Description |
|------------|-------------|
| `dom:read` | Read DOM elements and attributes |
| `dom:write` | Modify DOM elements |
| `storage:read` | Access localStorage/sessionStorage |
| `storage:write` | Modify storage |
| `network:fetch` | Make network requests |
| `clipboard:read` | Read clipboard contents |
| `clipboard:write` | Write to clipboard |

### Input Validation

- All tool inputs validated against declared JSON Schema
- Reject malformed or oversized payloads
- Sanitize string inputs before DOM operations

### Sandboxing (Optional)

Support for isolated tool execution via:

- Web Workers
- Sandboxed iframes
- SES (Secure ECMAScript)

---

## Distribution Requirements

### Package Formats

| Format | Target | File |
|--------|--------|------|
| UMD | Browser (global) | `dist/btcp-client.umd.js` |
| ESM | Modern bundlers | `dist/btcp-client.esm.js` |
| CJS | Node.js | `dist/btcp-client.cjs.js` |
| IIFE | Direct script tag | `dist/btcp-client.min.js` |

### CDN Distribution

```html
<!-- Production (minified) -->
<script src="https://cdn.btcp.dev/client@1.0.0/btcp-client.min.js"></script>

<!-- Development (with source maps) -->
<script src="https://cdn.btcp.dev/client@1.0.0/btcp-client.js"></script>
```

### Bundle Size Targets

| Bundle | Target Size |
|--------|-------------|
| Core (minified + gzip) | < 5 KB |
| Full (with all transports) | < 10 KB |

---

## Framework Binding Requirements

### React (`@btcp/react`)

```typescript
// Provider component
export function BTCPProvider(props: {
  serverUrl: string;
  options?: BTCPClientOptions;
  children: React.ReactNode;
}): JSX.Element;

// Hook for accessing client
export function useBTCPClient(): {
  client: BTCPClient;
  status: ConnectionStatus;
  registerTool: (def: ToolDefinition) => void;
  tools: ToolDefinition[];
};

// Hook for tool results
export function useToolResult(toolName: string): {
  lastCall: ToolCall | null;
  lastResult: unknown;
};
```

### Vue (`@btcp/vue`)

```typescript
// Composable
export function useBTCP(options: BTCPClientOptions): {
  client: Ref<BTCPClient>;
  status: Ref<ConnectionStatus>;
  registerTool: (def: ToolDefinition) => void;
  tools: Ref<ToolDefinition[]>;
};

// Plugin
export const BTCPPlugin: Plugin;
```

---

## Error Handling

### Error Codes (JSON-RPC Standard + Custom)

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC structure |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Parameter validation failed |
| -32603 | Internal error | Server/client internal error |
| -32000 | Tool not found | Requested tool not registered |
| -32001 | Tool execution error | Handler threw an exception |
| -32002 | Capability denied | Missing required capability |
| -32003 | Timeout | Tool execution timeout |

---

## Testing Requirements

### Unit Tests

- Transport layer isolation
- Message serialization/deserialization
- Tool registration and invocation
- Reconnection logic

### Integration Tests

- End-to-end with mock BTCP server
- Multiple concurrent tool calls
- Error handling and recovery

### Browser Tests

- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- CDN script loading
- Memory leak detection

---

## Documentation Requirements

1. **Quick Start Guide** - 5-minute integration
2. **API Reference** - Full TypeScript documentation
3. **Protocol Guide** - JSON-RPC message formats
4. **Security Guide** - Capability system and best practices
5. **Framework Guides** - React, Vue, Svelte integration
6. **Examples** - Common use cases and patterns
7. **Migration Guide** - Upgrading between versions

---

## Versioning

- Follow [Semantic Versioning 2.0.0](https://semver.org/)
- Protocol version in tool manifests
- Backward compatibility for minor versions

---

## License

MPL-2.0 (consistent with BTCP ecosystem)

---

## References

- [BTCP Specification](https://github.com/browser-tool-calling-protocol/btcp-specification)
- [BTCP Client Reference](https://github.com/browser-tool-calling-protocol/btcp-client)
- [BTCP Server](https://github.com/browser-tool-calling-protocol/btcp-server)
- [BTCP MCP Bridge](https://github.com/browser-tool-calling-protocol/btcp-mcp)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Model Context Protocol](https://modelcontextprotocol.io/)
