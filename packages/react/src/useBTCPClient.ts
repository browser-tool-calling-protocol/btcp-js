/**
 * useBTCPClient Hook
 *
 * Provides access to the BTCP client and helper functions.
 */

import { useCallback, useMemo } from 'react';
import { useBTCPContext } from './BTCPProvider';
import type { ToolDefinition } from '@btcp/vanilla';

/**
 * Return type for useBTCPClient hook
 */
export interface UseBTCPClientResult {
  /** The BTCP client instance */
  client: ReturnType<typeof useBTCPContext>['client'];
  /** Current connection status */
  status: ReturnType<typeof useBTCPContext>['status'];
  /** Whether the client is connected */
  isConnected: boolean;
  /** Whether the client is connecting */
  isConnecting: boolean;
  /** Register a tool with the client */
  registerTool: (definition: ToolDefinition) => void;
  /** Unregister a tool by name */
  unregisterTool: (name: string) => boolean;
  /** List of registered tools */
  tools: ToolDefinition[];
  /** Connect to the server */
  connect: () => Promise<void>;
  /** Disconnect from the server */
  disconnect: () => Promise<void>;
}

/**
 * Hook to access the BTCP client
 *
 * @example
 * ```tsx
 * function ChatInterface() {
 *   const { registerTool, status, isConnected } = useBTCPClient();
 *
 *   useEffect(() => {
 *     registerTool({
 *       name: 'get_page_title',
 *       description: 'Returns the current page title',
 *       handler: () => document.title
 *     });
 *   }, [registerTool]);
 *
 *   return <div>Status: {status}</div>;
 * }
 * ```
 */
export function useBTCPClient(): UseBTCPClientResult {
  const { client, status, connect, disconnect } = useBTCPContext();

  const registerTool = useCallback(
    (definition: ToolDefinition) => {
      if (!client) {
        throw new Error('BTCP client is not initialized');
      }
      client.registerTool(definition);
    },
    [client]
  );

  const unregisterTool = useCallback(
    (name: string): boolean => {
      if (!client) {
        return false;
      }
      return client.unregisterTool(name);
    },
    [client]
  );

  const tools = useMemo(() => {
    return client?.listTools() ?? [];
  }, [client, status]); // Re-compute when status changes (tools might have synced)

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return {
    client,
    status,
    isConnected,
    isConnecting,
    registerTool,
    unregisterTool,
    tools,
    connect,
    disconnect,
  };
}
