/**
 * BTCP Vanilla Client Type Definitions
 */

/**
 * JSON Schema type for tool input validation
 */
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchema;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'bearer' | 'basic' | 'custom';
  /** Bearer token */
  token?: string;
  /** Basic auth credentials */
  credentials?: { username: string; password: string };
  /** Custom headers for authentication */
  headers?: Record<string, string>;
}

/**
 * Options for creating a BTCP client
 */
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

  /** Granted capabilities for security layer (defaults to all capabilities) */
  capabilities?: string[];
}

/**
 * Tool definition with inline handler
 */
export interface ToolDefinition {
  /** Unique tool name */
  name: string;

  /** Human-readable description for AI agents */
  description: string;

  /** JSON Schema for input validation */
  inputSchema?: JSONSchema;

  /** Required capabilities for this tool */
  capabilities?: string[];

  /** Tool execution handler */
  handler: (params: unknown) => unknown | Promise<unknown>;

  /** Tool version (semver) */
  version?: string;
}

/**
 * Protocol tool definition (without handler, for server registration)
 */
export interface ProtocolToolDefinition {
  name: string;
  description: string;
  inputSchema?: JSONSchema;
  capabilities?: string[];
  version?: string;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * BTCP event types
 */
export type BTCPEvent =
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'error'
  | 'tool:call'
  | 'tool:result'
  | 'message';

/**
 * Event payload types
 */
export interface BTCPEventPayloads {
  connect: { sessionId: string };
  disconnect: { reason: string; code?: number };
  reconnect: { attempt: number };
  error: { error: Error; context?: string };
  'tool:call': { name: string; params: unknown; id: string };
  'tool:result': { name: string; result: unknown; id: string };
  message: unknown;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Unsubscribe function returned by event subscriptions
 */
export type Unsubscribe = () => void;
