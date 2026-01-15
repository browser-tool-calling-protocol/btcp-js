/**
 * VanillaClient
 *
 * A convenience wrapper around @btcp/client that provides:
 * - Simplified API with createClient factory
 * - Inline tool handler registration
 * - Capability-based security
 * - Automatic tool synchronization
 */

import { BTCPClient, ToolExecutor } from '@anthropic-ai/btcp-client';
import type {
  CreateClientOptions,
  ToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  EventHandler,
  Unsubscribe,
} from './types';
import { ToolRegistry } from './tools/registry';
import { CapabilityManager } from './security/capabilities';

/**
 * BTCP Vanilla Client
 *
 * Wraps the core BTCP client with a developer-friendly API.
 */
export class VanillaClient {
  private core: BTCPClient;
  private executor: ToolExecutor;
  private registry: ToolRegistry;
  private capabilities: CapabilityManager;
  private _status: ConnectionStatus = 'disconnected';
  private eventHandlers: Map<BTCPEvent, Set<EventHandler>> = new Map();
  private options: CreateClientOptions;

  constructor(options: CreateClientOptions) {
    this.options = options;

    // Initialize core client
    this.core = new BTCPClient({
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
    this.setupToolCallHandling();
  }

  /**
   * Connect to the BTCP server
   */
  async connect(): Promise<void> {
    this._status = 'connecting';
    this.emit('connect', { sessionId: '' });

    try {
      await this.core.connect();
      // Register all tools with the server
      await this.syncTools();
      this._status = 'connected';
      this.emit('connect', { sessionId: this.sessionId || '' });
    } catch (error) {
      this._status = 'disconnected';
      this.emit('error', { error: error as Error, context: 'connect' });
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    try {
      await this.core.disconnect();
    } finally {
      this._status = 'disconnected';
      this.emit('disconnect', { reason: 'manual', code: 1000 });
    }
  }

  /**
   * Current connection status
   */
  get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * Whether the client is connected
   */
  get isConnected(): boolean {
    return this._status === 'connected' && this.core.isConnected();
  }

  /**
   * Session ID
   */
  get sessionId(): string | undefined {
    return this.core.getSessionId();
  }

  /**
   * Register a tool with inline handler
   */
  registerTool(definition: ToolDefinition): void {
    // Validate required fields
    if (!definition.name) {
      throw new Error('Tool name is required');
    }
    if (!definition.description) {
      throw new Error('Tool description is required');
    }
    if (typeof definition.handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    // Check capabilities if specified
    if (definition.capabilities && definition.capabilities.length > 0) {
      const check = this.capabilities.check(definition.capabilities);
      if (!check.allowed) {
        throw new Error(
          `Cannot register tool "${definition.name}": missing capabilities: ${check.missing.join(', ')}`
        );
      }
    }

    // Store in registry
    this.registry.register(definition);

    // Register handler with executor
    this.executor.registerHandler(definition.name, async (params: unknown) => {
      try {
        const result = await definition.handler(params);
        this.emit('tool:result', {
          name: definition.name,
          result,
          id: '', // ID will be set by the caller
        });
        return result;
      } catch (error) {
        this.emit('error', {
          error: error as Error,
          context: `tool:${definition.name}`,
        });
        throw error;
      }
    });

    // If connected, sync with server
    if (this.isConnected) {
      this.syncTools().catch((error) => {
        console.error('[BTCP] Failed to sync tools after registration:', error);
      });
    }
  }

  /**
   * Unregister a tool by name
   */
  unregisterTool(name: string): boolean {
    const removed = this.registry.unregister(name);

    // If connected, sync with server to update tool list
    if (removed && this.isConnected) {
      this.syncTools().catch((error) => {
        console.error('[BTCP] Failed to sync tools after unregistration:', error);
      });
    }

    return removed;
  }

  /**
   * List all registered tools
   */
  listTools(): ToolDefinition[] {
    return this.registry.list();
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Subscribe to an event
   */
  on<E extends BTCPEvent>(event: E, handler: EventHandler): Unsubscribe {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Also subscribe to core client events
    this.core.on(event, handler);

    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<E extends BTCPEvent>(event: E, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    this.core.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time)
   */
  once<E extends BTCPEvent>(event: E, handler: EventHandler): Unsubscribe {
    const wrappedHandler: EventHandler = (payload) => {
      this.off(event, wrappedHandler);
      handler(payload);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Access the underlying core client
   */
  get coreClient(): BTCPClient {
    return this.core;
  }

  /**
   * Access the tool executor
   */
  get toolExecutor(): ToolExecutor {
    return this.executor;
  }

  /**
   * Access the capability manager
   */
  get capabilityManager(): CapabilityManager {
    return this.capabilities;
  }

  /**
   * Cleanup and destroy the client
   */
  destroy(): void {
    this.disconnect().catch(() => {
      // Ignore disconnect errors during destroy
    });
    this.registry.clear();
    this.capabilities.clear();
    this.eventHandlers.clear();
  }

  /**
   * Sync registered tools with the server
   */
  private async syncTools(): Promise<void> {
    const definitions = this.registry.toProtocolFormat();
    if (definitions.length > 0) {
      await this.core.registerTools(definitions);
    }
  }

  /**
   * Set up event forwarding from core client
   */
  private setupEventForwarding(): void {
    this.core.on('connect', () => {
      this._status = 'connected';
    });

    this.core.on('disconnect', () => {
      this._status = 'disconnected';
    });

    this.core.on('reconnect', (payload: unknown) => {
      this._status = 'reconnecting';
      this.emit('reconnect', payload as { attempt: number });
    });

    this.core.on('error', (payload: unknown) => {
      this.emit('error', payload as { error: Error; context?: string });
    });
  }

  /**
   * Set up tool call handling
   */
  private setupToolCallHandling(): void {
    this.core.on('tool:call', (payload: unknown) => {
      const { name, params, id } = payload as {
        name: string;
        params: unknown;
        id: string;
      };
      this.emit('tool:call', { name, params, id });
    });
  }

  /**
   * Emit an event to all handlers
   */
  private emit<E extends BTCPEvent>(event: E, payload: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[BTCP] Error in event handler for "${event}":`, error);
        }
      });
    }
  }
}
