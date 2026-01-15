/**
 * useBTCP Composable
 *
 * Vue 3 composable for BTCP client integration.
 */

import {
  ref,
  readonly,
  onMounted,
  onUnmounted,
  type Ref,
  type DeepReadonly,
} from 'vue';
import {
  createClient,
  VanillaClient,
  type CreateClientOptions,
  type ConnectionStatus,
  type ToolDefinition,
} from '@btcp/vanilla';

/**
 * Return type for useBTCP composable
 */
export interface UseBTCPResult {
  /** The BTCP client instance (readonly) */
  client: DeepReadonly<Ref<VanillaClient | null>>;
  /** Current connection status (readonly) */
  status: DeepReadonly<Ref<ConnectionStatus>>;
  /** List of registered tools (readonly) */
  tools: DeepReadonly<Ref<ToolDefinition[]>>;
  /** Whether the client is connected */
  isConnected: () => boolean;
  /** Whether the client is connecting */
  isConnecting: () => boolean;
  /** Register a tool with the client */
  registerTool: (definition: ToolDefinition) => void;
  /** Unregister a tool by name */
  unregisterTool: (name: string) => boolean;
  /** Connect to the server */
  connect: () => Promise<void>;
  /** Disconnect from the server */
  disconnect: () => Promise<void>;
}

/**
 * Options for useBTCP composable
 */
export interface UseBTCPOptions extends CreateClientOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * Vue 3 composable for BTCP client
 *
 * @example
 * ```vue
 * <script setup>
 * import { useBTCP } from '@btcp/vue';
 *
 * const { client, status, registerTool } = useBTCP({
 *   serverUrl: 'https://your-server.com'
 * });
 *
 * registerTool({
 *   name: 'get_vue_state',
 *   description: 'Returns Vue component state',
 *   handler: () => ({ count: count.value })
 * });
 * </script>
 *
 * <template>
 *   <div>Status: {{ status }}</div>
 * </template>
 * ```
 */
export function useBTCP(options: UseBTCPOptions): UseBTCPResult {
  const { autoConnect = true, ...clientOptions } = options;

  const client = ref<VanillaClient | null>(null);
  const status = ref<ConnectionStatus>('disconnected');
  const tools = ref<ToolDefinition[]>([]);

  // Initialize client on mount
  onMounted(async () => {
    const instance = createClient(clientOptions);
    client.value = instance;

    // Set up event listeners
    instance.on('connect', () => {
      status.value = 'connected';
      tools.value = instance.listTools();
    });

    instance.on('disconnect', () => {
      status.value = 'disconnected';
    });

    instance.on('reconnect', () => {
      status.value = 'reconnecting';
    });

    // Auto-connect if enabled
    if (autoConnect) {
      status.value = 'connecting';
      try {
        await instance.connect();
      } catch (error) {
        console.error('[BTCP Vue] Connection failed:', error);
        status.value = 'disconnected';
      }
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    if (client.value) {
      client.value.destroy();
      client.value = null;
    }
  });

  // Register a tool
  const registerTool = (definition: ToolDefinition): void => {
    if (!client.value) {
      throw new Error('BTCP client is not initialized');
    }
    client.value.registerTool(definition);
    tools.value = client.value.listTools();
  };

  // Unregister a tool
  const unregisterTool = (name: string): boolean => {
    if (!client.value) {
      return false;
    }
    const result = client.value.unregisterTool(name);
    tools.value = client.value.listTools();
    return result;
  };

  // Connect to server
  const connect = async (): Promise<void> => {
    if (client.value && status.value !== 'connected' && status.value !== 'connecting') {
      status.value = 'connecting';
      await client.value.connect();
    }
  };

  // Disconnect from server
  const disconnect = async (): Promise<void> => {
    if (client.value && status.value === 'connected') {
      await client.value.disconnect();
    }
  };

  // Helper functions
  const isConnected = (): boolean => status.value === 'connected';
  const isConnecting = (): boolean => status.value === 'connecting';

  return {
    client: readonly(client) as DeepReadonly<Ref<VanillaClient | null>>,
    status: readonly(status),
    tools: readonly(tools),
    isConnected,
    isConnecting,
    registerTool,
    unregisterTool,
    connect,
    disconnect,
  };
}
