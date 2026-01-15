# @btcp/vanilla

A convenience wrapper for the Browser Tool Calling Protocol (BTCP) client, providing a simplified API for registering and executing browser-based tools for AI agents.

## Installation

```bash
# npm
npm install @btcp/vanilla

# yarn
yarn add @btcp/vanilla

# pnpm
pnpm add @btcp/vanilla
```

### CDN Usage

```html
<script src="https://unpkg.com/@btcp/vanilla"></script>
<script>
  const client = BTCP.createClient({ serverUrl: 'https://your-server.com' });
</script>
```

## Quick Start

```typescript
import { createClient } from '@btcp/vanilla';

// Create client instance
const client = createClient({
  serverUrl: 'https://your-btcp-server.com',
});

// Register a tool with inline handler
client.registerTool({
  name: 'get_page_title',
  description: 'Returns the current page title',
  handler: () => document.title,
});

// Register a tool with parameters
client.registerTool({
  name: 'click_element',
  description: 'Clicks an element by CSS selector',
  inputSchema: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector' },
    },
    required: ['selector'],
  },
  capabilities: ['dom:write'],
  handler: ({ selector }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    el.click();
    return { clicked: selector };
  },
});

// Connect to server
await client.connect();
```

## API Reference

### `createClient(options)`

Factory function to create a new BTCP client instance.

```typescript
const client = createClient({
  serverUrl: 'https://your-btcp-server.com',
  sessionId: 'optional-session-id',
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  connectionTimeout: 10000,
  debug: false,
  capabilities: ['dom:read', 'dom:write'], // Restrict capabilities
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | `string` | Required | BTCP server URL |
| `sessionId` | `string` | Auto-generated | Session identifier |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `reconnectDelay` | `number` | `1000` | Reconnect delay in ms |
| `maxReconnectAttempts` | `number` | `5` | Max reconnect attempts |
| `connectionTimeout` | `number` | `10000` | Connection timeout in ms |
| `debug` | `boolean` | `false` | Enable debug logging |
| `capabilities` | `string[]` | All | Granted capabilities |

### Client Methods

#### Connection

```typescript
await client.connect();      // Connect to server
await client.disconnect();   // Disconnect from server
client.isConnected;          // Connection status boolean
client.status;               // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
client.sessionId;            // Current session ID
```

#### Tool Registration

```typescript
// Register a tool
client.registerTool({
  name: 'tool_name',
  description: 'What this tool does',
  inputSchema: { /* JSON Schema */ },
  capabilities: ['dom:read'],
  handler: async (params) => { /* return result */ },
});

// Unregister a tool
client.unregisterTool('tool_name');

// List registered tools
const tools = client.listTools();

// Check if tool exists
const exists = client.hasTool('tool_name');
```

#### Events

```typescript
// Subscribe to events
const unsubscribe = client.on('connect', ({ sessionId }) => {
  console.log('Connected:', sessionId);
});

// One-time subscription
client.once('error', ({ error }) => {
  console.error('Error:', error);
});

// Unsubscribe
unsubscribe();
// or
client.off('connect', handler);
```

**Available Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | `{ sessionId }` | Connected to server |
| `disconnect` | `{ reason, code }` | Disconnected from server |
| `reconnect` | `{ attempt }` | Reconnection attempt |
| `error` | `{ error, context }` | Error occurred |
| `tool:call` | `{ name, params, id }` | Tool invocation received |
| `tool:result` | `{ name, result, id }` | Tool execution completed |

### Capabilities

BTCP uses capability-based security to control what tools can do. Restrict capabilities when creating the client to limit tool permissions.

```typescript
import { createClient, CAPABILITIES } from '@btcp/vanilla';

const client = createClient({
  serverUrl: 'https://server.com',
  capabilities: [
    CAPABILITIES.DOM_READ,
    CAPABILITIES.STORAGE_READ,
  ],
});
```

**Available Capabilities:**

| Capability | Value | Description |
|------------|-------|-------------|
| `DOM_READ` | `dom:read` | Read DOM elements |
| `DOM_WRITE` | `dom:write` | Modify DOM elements |
| `STORAGE_READ` | `storage:read` | Read from storage |
| `STORAGE_WRITE` | `storage:write` | Write to storage |
| `NETWORK_FETCH` | `network:fetch` | Make network requests |
| `CLIPBOARD_READ` | `clipboard:read` | Read clipboard |
| `CLIPBOARD_WRITE` | `clipboard:write` | Write to clipboard |

Tools that require missing capabilities will fail to register:

```typescript
// This will throw if 'dom:write' is not granted
client.registerTool({
  name: 'click',
  description: 'Click element',
  capabilities: ['dom:write'],
  handler: () => {},
});
```

### Advanced Usage

#### Access Core Client

```typescript
const core = client.coreClient;
const executor = client.toolExecutor;
const capabilities = client.capabilityManager;
```

#### Re-exported Utilities

```typescript
import {
  createRequest,
  createResponse,
  createTextContent,
  createImageContent,
  parseMessage,
  serializeMessage,
} from '@btcp/vanilla';
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  CreateClientOptions,
  ToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  Capability,
  JSONSchema,
} from '@btcp/vanilla';
```

## License

MIT
