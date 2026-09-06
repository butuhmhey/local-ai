/**
 * Cache Engine - Service Worker registration and model caching
 * Handles PWA offline support and model weight caching
 */

export class CacheEngine {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  /** Register Service Worker */
  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[CacheEngine] Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[CacheEngine] Service Worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check for updates periodically
      setInterval(() => this.checkForUpdates(), 60 * 60 * 1000); // Every hour

    } catch (error) {
      console.error('[CacheEngine] Service Worker registration failed:', error);
    }
  }

  /** Check for SW updates */
  async checkForUpdates(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }

  /** Notify user of update */
  private notifyUpdateAvailable(): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /** Check if update is available */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /** Apply update (reload page) */
  applyUpdate(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /** Cache model weights (called after model download) */
  async cacheModel(modelId: string, modelUrl: string): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open('webllm-models');
      const response = await fetch(modelUrl);
      if (response.ok) {
        await cache.put(modelUrl, response);
        console.log('[CacheEngine] Cached model:', modelId);
      }
    } catch (error) {
      console.warn('[CacheEngine] Failed to cache model:', error);
    }
  }

  /** Get cached model */
  async getCachedModel(modelUrl: string): Promise<Response | null> {
    if (!('caches' in window)) return null;

    try {
      const cache = await caches.open('webllm-models');
      const response = await cache.match(modelUrl);
      return response ?? null;
    } catch {
      return null;
    }
  }

  /** Get all cached model URLs */
  async getCachedModels(): Promise<{ modelId: string; size: number }[]> {
    if (!('caches' in window)) return [];

    try {
      const cache = await caches.open('webllm-models');
      const keys = await cache.keys();
      const results: { modelId: string; size: number }[] = [];
      for (const req of keys) {
        const response = await cache.match(req);
        if (response) {
          // Extract modelId from URL
          const url = new URL(req.url);
          const modelId = url.pathname.split('/').pop() || req.url;
          // Estimate size from response
          const size = parseInt(response.headers.get('content-length') || '0', 10);
          results.push({ modelId, size });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  /** Remove specific model from cache */
  async removeModel(modelId: string): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open('webllm-models');
      const keys = await cache.keys();
      for (const req of keys) {
        const url = new URL(req.url);
        if (url.pathname.includes(modelId) || req.url.includes(modelId)) {
          await cache.delete(req);
          console.log('[CacheEngine] Removed model from cache:', modelId);
        }
      }
    } catch (error) {
      console.warn('[CacheEngine] Failed to remove model from cache:', error);
    }
  }

  /** Clear model cache */
  async clearModelCache(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      await caches.delete('webllm-models');
      console.log('[CacheEngine] Model cache cleared');
    } catch (error) {
      console.warn('[CacheEngine] Failed to clear model cache:', error);
    }
  }

  /** Clear all caches */
  async clearAll(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[CacheEngine] All caches cleared');
    } catch (error) {
      console.warn('[CacheEngine] Failed to clear caches:', error);
    }
  }

  /** Get cache storage estimate */
  async getCacheSize(): Promise<number> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  }

  /** Clear all caches */
  async clearAllCaches(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[CacheEngine] All caches cleared');
    } catch (error) {
      console.warn('[CacheEngine] Failed to clear caches:', error);
    }
  }

  /** Request persistent storage */
  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      const persisted = await navigator.storage.persist();
      console.log('[CacheEngine] Persistent storage:', persisted ? 'granted' : 'denied');
      return persisted;
    } catch {
      return false;
    }
  }

  /** Get Service Worker registration */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// Export singleton
export const cacheEngine = new CacheEngine();