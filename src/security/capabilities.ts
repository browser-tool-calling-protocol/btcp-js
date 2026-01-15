/**
 * Capability Manager
 *
 * Manages and validates tool capabilities for security purposes.
 */

/**
 * Standard BTCP capabilities
 */
export const CAPABILITIES = {
  DOM_READ: 'dom:read',
  DOM_WRITE: 'dom:write',
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',
  NETWORK_FETCH: 'network:fetch',
  CLIPBOARD_READ: 'clipboard:read',
  CLIPBOARD_WRITE: 'clipboard:write',
} as const;

/**
 * All available capabilities
 */
export const ALL_CAPABILITIES = Object.values(CAPABILITIES);

/**
 * Capability type
 */
export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/**
 * Result of a capability check
 */
export interface CapabilityCheckResult {
  /** Whether all required capabilities are granted */
  allowed: boolean;
  /** List of missing capabilities */
  missing: string[];
}

/**
 * Manages granted capabilities and validates tool requirements
 */
export class CapabilityManager {
  private granted: Set<string>;

  /**
   * Create a new CapabilityManager
   * @param capabilities - Initial capabilities to grant (defaults to all capabilities)
   */
  constructor(capabilities?: string[]) {
    this.granted = new Set(capabilities ?? ALL_CAPABILITIES);
  }

  /**
   * Grant a capability
   */
  grant(capability: string): void {
    this.granted.add(capability);
  }

  /**
   * Grant multiple capabilities
   */
  grantAll(capabilities: string[]): void {
    capabilities.forEach((cap) => this.granted.add(cap));
  }

  /**
   * Revoke a capability
   */
  revoke(capability: string): void {
    this.granted.delete(capability);
  }

  /**
   * Revoke multiple capabilities
   */
  revokeAll(capabilities: string[]): void {
    capabilities.forEach((cap) => this.granted.delete(cap));
  }

  /**
   * Check if a capability is granted
   */
  has(capability: string): boolean {
    return this.granted.has(capability);
  }

  /**
   * Check if all required capabilities are granted
   */
  check(required: string[]): CapabilityCheckResult {
    const missing = required.filter((cap) => !this.granted.has(cap));
    return {
      allowed: missing.length === 0,
      missing,
    };
  }

  /**
   * List all granted capabilities
   */
  listGranted(): string[] {
    return Array.from(this.granted);
  }

  /**
   * Clear all granted capabilities
   */
  clear(): void {
    this.granted.clear();
  }

  /**
   * Reset to default capabilities (all granted)
   */
  reset(): void {
    this.granted = new Set(ALL_CAPABILITIES);
  }

  /**
   * Get the number of granted capabilities
   */
  get size(): number {
    return this.granted.size;
  }
}
