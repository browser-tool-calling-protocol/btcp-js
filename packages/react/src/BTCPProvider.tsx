/**
 * BTCP React Provider
 *
 * Provides BTCP client context to React components.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  createClient,
  VanillaClient,
  type CreateClientOptions,
  type ConnectionStatus,
} from '@btcp/vanilla';

/**
 * BTCP Context value
 */
export interface BTCPContextValue {
  /** The BTCP client instance */
  client: VanillaClient | null;
  /** Current connection status */
  status: ConnectionStatus;
  /** Manually connect to the server */
  connect: () => Promise<void>;
  /** Manually disconnect from the server */
  disconnect: () => Promise<void>;
}

/**
 * BTCP React Context
 */
const BTCPContext = createContext<BTCPContextValue | null>(null);

/**
 * Props for BTCPProvider
 */
export interface BTCPProviderProps {
  /** BTCP server URL */
  serverUrl: string;
  /** Additional client options */
  options?: Omit<CreateClientOptions, 'serverUrl'>;
  /** Child components */
  children: ReactNode;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * BTCP Provider Component
 *
 * Wraps your application to provide BTCP client context.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <BTCPProvider serverUrl="https://your-server.com">
 *       <ChatInterface />
 *     </BTCPProvider>
 *   );
 * }
 * ```
 */
export function BTCPProvider({
  serverUrl,
  options,
  children,
  autoConnect = true,
}: BTCPProviderProps): JSX.Element {
  const clientRef = useRef<VanillaClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  // Initialize client
  useEffect(() => {
    const client = createClient({ serverUrl, ...options });
    clientRef.current = client;

    // Set up event listeners
    const unsubConnect = client.on('connect', () => setStatus('connected'));
    const unsubDisconnect = client.on('disconnect', () => setStatus('disconnected'));
    const unsubReconnect = client.on('reconnect', () => setStatus('reconnecting'));

    // Auto-connect if enabled
    if (autoConnect) {
      setStatus('connecting');
      client.connect().catch((error) => {
        console.error('[BTCP React] Connection failed:', error);
        setStatus('disconnected');
      });
    }

    // Cleanup
    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      client.destroy();
      clientRef.current = null;
    };
  }, [serverUrl, autoConnect]);

  // Connect function
  const connect = useCallback(async () => {
    if (clientRef.current && status !== 'connected' && status !== 'connecting') {
      setStatus('connecting');
      await clientRef.current.connect();
    }
  }, [status]);

  // Disconnect function
  const disconnect = useCallback(async () => {
    if (clientRef.current && status === 'connected') {
      await clientRef.current.disconnect();
    }
  }, [status]);

  const contextValue: BTCPContextValue = {
    client: clientRef.current,
    status,
    connect,
    disconnect,
  };

  return (
    <BTCPContext.Provider value={contextValue}>
      {children}
    </BTCPContext.Provider>
  );
}

/**
 * Hook to access the BTCP context
 *
 * @throws Error if used outside of BTCPProvider
 */
export function useBTCPContext(): BTCPContextValue {
  const context = useContext(BTCPContext);
  if (!context) {
    throw new Error('useBTCPContext must be used within a BTCPProvider');
  }
  return context;
}

export { BTCPContext };
