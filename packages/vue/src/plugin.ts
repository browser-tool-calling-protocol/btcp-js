/**
 * BTCP Vue Plugin
 *
 * Vue 3 plugin for global BTCP client integration.
 */

import type { App, InjectionKey } from 'vue';
import type { CreateClientOptions } from '@btcp/vanilla';
import { useBTCP, type UseBTCPResult } from './useBTCP';

/**
 * Injection key for BTCP client
 */
export const BTCPKey: InjectionKey<UseBTCPResult> = Symbol('btcp');

/**
 * Plugin options
 */
export interface BTCPPluginOptions extends CreateClientOptions {
  /** Auto-connect on plugin install (default: true) */
  autoConnect?: boolean;
}

/**
 * BTCP Vue Plugin
 *
 * Provides global BTCP client access via Vue's provide/inject.
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue';
 * import { BTCPPlugin } from '@btcp/vue';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 *
 * app.use(BTCPPlugin, {
 *   serverUrl: 'https://your-server.com'
 * });
 *
 * app.mount('#app');
 * ```
 *
 * Then in components:
 *
 * ```vue
 * <script setup>
 * import { inject } from 'vue';
 * import { BTCPKey } from '@btcp/vue';
 *
 * const btcp = inject(BTCPKey);
 * </script>
 * ```
 */
export const BTCPPlugin = {
  install(app: App, options: BTCPPluginOptions): void {
    // Create the BTCP instance
    // Note: This creates the instance at plugin install time
    // For SSR, you might want to handle this differently
    const btcp = useBTCP(options);

    // Provide to all components
    app.provide(BTCPKey, btcp);

    // Also add to global properties for Options API access
    app.config.globalProperties.$btcp = btcp;
  },
};

// Type augmentation for global properties
declare module 'vue' {
  interface ComponentCustomProperties {
    $btcp: UseBTCPResult;
  }
}
