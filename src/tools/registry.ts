/**
 * Tool Registry
 *
 * Manages registered tools with their handlers and provides
 * conversion to protocol format for server registration.
 */

import type { ToolDefinition, ProtocolToolDefinition } from '../types';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool definition with handler
   */
  register(definition: ToolDefinition): void {
    if (!definition.name) {
      throw new Error('Tool name is required');
    }
    if (!definition.description) {
      throw new Error('Tool description is required');
    }
    if (typeof definition.handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    if (this.tools.has(definition.name)) {
      console.warn(`[BTCP] Tool "${definition.name}" is being overwritten`);
    }

    this.tools.set(definition.name, definition);
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool definition by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get the number of registered tools
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Convert to protocol format (without handlers) for server registration
   */
  toProtocolFormat(): ProtocolToolDefinition[] {
    return this.list().map(({ handler: _, ...rest }) => rest);
  }

  /**
   * Execute a tool handler by name
   */
  async execute(name: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    return tool.handler(params);
  }
}
