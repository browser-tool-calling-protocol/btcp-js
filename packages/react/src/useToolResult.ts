/**
 * useToolResult Hook
 *
 * Subscribe to tool call results for a specific tool.
 */

import { useState, useEffect, useCallback } from 'react';
import { useBTCPContext } from './BTCPProvider';

/**
 * Tool call information
 */
export interface ToolCall {
  /** Tool name */
  name: string;
  /** Call parameters */
  params: unknown;
  /** Call ID */
  id: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Tool result information
 */
export interface ToolResult {
  /** Tool name */
  name: string;
  /** Result value */
  result: unknown;
  /** Call ID */
  id: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Return type for useToolResult hook
 */
export interface UseToolResultResult {
  /** Last tool call for this tool */
  lastCall: ToolCall | null;
  /** Last result for this tool */
  lastResult: ToolResult | null;
  /** Whether the tool is currently being executed */
  isExecuting: boolean;
  /** Clear the stored call and result */
  clear: () => void;
}

/**
 * Hook to subscribe to tool call results
 *
 * @param toolName - Name of the tool to subscribe to
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const { lastResult, isExecuting } = useToolResult('search_dom');
 *
 *   if (isExecuting) {
 *     return <div>Searching...</div>;
 *   }
 *
 *   if (lastResult) {
 *     return <div>Found: {JSON.stringify(lastResult.result)}</div>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useToolResult(toolName: string): UseToolResultResult {
  const { client } = useBTCPContext();
  const [lastCall, setLastCall] = useState<ToolCall | null>(null);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (!client) return;

    // Subscribe to tool calls
    const unsubCall = client.on('tool:call', (payload) => {
      const { name, params, id } = payload as {
        name: string;
        params: unknown;
        id: string;
      };
      if (name === toolName) {
        setLastCall({
          name,
          params,
          id,
          timestamp: Date.now(),
        });
        setIsExecuting(true);
      }
    });

    // Subscribe to tool results
    const unsubResult = client.on('tool:result', (payload) => {
      const { name, result, id } = payload as {
        name: string;
        result: unknown;
        id: string;
      };
      if (name === toolName) {
        setLastResult({
          name,
          result,
          id,
          timestamp: Date.now(),
        });
        setIsExecuting(false);
      }
    });

    // Subscribe to errors (in case tool execution fails)
    const unsubError = client.on('error', (payload) => {
      const { context } = payload as { error: Error; context?: string };
      if (context === `tool:${toolName}`) {
        setIsExecuting(false);
      }
    });

    return () => {
      unsubCall();
      unsubResult();
      unsubError();
    };
  }, [client, toolName]);

  const clear = useCallback(() => {
    setLastCall(null);
    setLastResult(null);
    setIsExecuting(false);
  }, []);

  return {
    lastCall,
    lastResult,
    isExecuting,
    clear,
  };
}
