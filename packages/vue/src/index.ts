/**
 * BTCP Vue Bindings
 *
 * Vue 3 composables and plugin for the BTCP vanilla client.
 *
 * @packageDocumentation
 */

// Composable
export { useBTCP } from './useBTCP';
export type { UseBTCPResult, UseBTCPOptions } from './useBTCP';

// Plugin
export { BTCPPlugin, BTCPKey } from './plugin';
export type { BTCPPluginOptions } from './plugin';

// Re-export types from vanilla client
export type {
  ToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  CreateClientOptions,
} from '@btcp/vanilla';
