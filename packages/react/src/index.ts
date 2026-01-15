/**
 * BTCP React Bindings
 *
 * React hooks and components for the BTCP vanilla client.
 *
 * @packageDocumentation
 */

// Provider and context
export { BTCPProvider, BTCPContext, useBTCPContext } from './BTCPProvider';
export type { BTCPProviderProps, BTCPContextValue } from './BTCPProvider';

// Hooks
export { useBTCPClient } from './useBTCPClient';
export type { UseBTCPClientResult } from './useBTCPClient';

export { useToolResult } from './useToolResult';
export type { UseToolResultResult, ToolCall, ToolResult } from './useToolResult';

// Re-export types from vanilla client
export type {
  ToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  CreateClientOptions,
} from '@btcp/vanilla';
