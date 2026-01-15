/**
 * BTCP Vanilla Client
 *
 * A convenience wrapper for the Browser Tool Calling Protocol client
 * with framework bindings and an ergonomic API.
 *
 * @packageDocumentation
 */

import { VanillaClient } from './client';
import type { CreateClientOptions } from './types';

// Re-export core utilities from @btcp/client
export {
  createRequest,
  createResponse,
  createTextContent,
  createImageContent,
  parseMessage,
  serializeMessage,
} from '@anthropic-ai/btcp-client';

// Export types
export type {
  CreateClientOptions,
  ToolDefinition,
  ProtocolToolDefinition,
  ConnectionStatus,
  BTCPEvent,
  BTCPEventPayloads,
  EventHandler,
  Unsubscribe,
  AuthConfig,
  JSONSchema,
} from './types';

// Export security utilities
export {
  CapabilityManager,
  CAPABILITIES,
  ALL_CAPABILITIES,
} from './security';
export type { Capability, CapabilityCheckResult } from './security';

// Export tool registry
export { ToolRegistry } from './tools';

// Export client class
export { VanillaClient };

/**
 * Create a new BTCP client instance
 *
 * @example
 * ```typescript
 * const client = createClient({
 *   serverUrl: 'https://your-btcp-server.com'
 * });
 *
 * client.registerTool({
 *   name: 'get_page_title',
 *   description: 'Returns the current page title',
 *   handler: () => document.title
 * });
 *
 * await client.connect();
 * ```
 */
export function createClient(options: CreateClientOptions): VanillaClient {
  return new VanillaClient(options);
}

// Default export for CDN/UMD usage
export default {
  createClient,
  VanillaClient,
  CAPABILITIES,
};
