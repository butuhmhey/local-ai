/**
 * Local AI Chat - Main Application Entry Point
 * Bootstraps the app, initializes services, sets up routing
 */

import './styles/global.css';
import { Route } from './types/index.js';

// Service imports (will be created in Phase 2)
import { StorageEngine } from './services/storageEngine.js';
import { ThemeEngine } from './services/themeEngine.js';
import { CacheEngine } from './services/cacheEngine.js';
import { WebLLMEngine } from './services/webllmEngine.js';
import { MemoryEngine } from './services/memoryEngine.js';
import { ImportEngine } from './services/importEngine.js';
import { ModelRegistry } from './models/modelRegistry.js';

// Page imports (will be created in Phase 3)
import { ChatPage } from './pages/ChatPage.js';
import { ModelLibraryPage } from './pages/ModelLibraryPage.js';
import { ImportExportPage } from './pages/ImportExportPage.js';
import { MemoryPage } from './pages/MemoryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

/** Application state */
interface AppState {
  currentRoute: Route;
  currentChatId: string | null;
  services: {
    storage: StorageEngine;
    theme: ThemeEngine;
    cache: CacheEngine;
    webllm: WebLLMEngine;
    memory: MemoryEngine;
    import: ImportEngine;
    models: ModelRegistry;
  };
  pages: {
    chat: ChatPage;
    models: ModelLibraryPage;
    import: ImportExportPage;
    memory: MemoryPage;
    settings: SettingsPage;
  };
}

/** Global app instance */
let app: AppState;

/** DOM elements */
const routeOutlet = document.getElementById('route-outlet') as HTMLElement;
const sidebar = document.querySelector('.sidebar') as HTMLElement;
const sidebarToggle = document.getElementById('sidebar-toggle') as HTMLButtonElement;
const navLinks = document.querySelectorAll('[data-route]') as NodeListOf<HTMLAnchorElement>;
const mobileMenuBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement;

/**
 * Initialize all services
 */
async function initializeServices(): Promise<AppState['services']> {
  // Initialize in dependency order
  const storage = new StorageEngine();
  await storage.init();

  const theme = new ThemeEngine();
  theme.init();

  const cache = new CacheEngine();
  await cache.register();

  const models = new ModelRegistry();

  const webllm = new WebLLMEngine();
  await webllm.init();

  const memory = new MemoryEngine(webllm, storage);

  const importEngine = new ImportEngine(webllm, storage);

  return { storage, theme, cache, webllm, memory, import: importEngine, models };
}

/**
 * Initialize all pages
 */
function initializePages(services: AppState['services']): AppState['pages'] {
  return {
    chat: new ChatPage(services),
    models: new ModelLibraryPage(services),
    import: new ImportExportPage(services),
    memory: new MemoryPage(services),
    settings: new SettingsPage(services),
  };
}

/**
 * Render a page into the route outlet
 */
function renderPage(page: keyof AppState['pages'], params?: Record<string, string>): void {
  const pageInstance = app.pages[page];
  routeOutlet.innerHTML = '';
  routeOutlet.appendChild(pageInstance.render(params));

  // Call page's onMount if it exists
  if (typeof pageInstance.onMount === 'function') {
    pageInstance.onMount(params);
  }
}

/**
 * Handle route change
 */
function navigate(route: Route, params?: Record<string, string>): void {
  // Update URL hash
  const hash = params ? `#${route}/${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}` : `#${route}`;
  window.location.hash = hash;

  // Update active nav link
  navLinks.forEach(link => {
    const linkRoute = link.dataset.route as Route;
    if (linkRoute === route) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  // Close mobile sidebar
  sidebar.classList.remove('open');

  // Render the page
  app.currentRoute = route;
  renderPage(route, params);
}

/**
 * Parse hash into route + params
 */
function parseHash(): { route: Route; params: Record<string, string> } {
  const hash = window.location.hash.slice(1) || 'chat';
  const [routePart, ...paramParts] = hash.split('/');
  const route = routePart as Route;

  const params: Record<string, string> = {};
  if (paramParts.length > 0) {
    paramParts.join('/').split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = decodeURIComponent(value);
    });
  }

  return { route, params };
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Hash change navigation
  window.addEventListener('hashchange', () => {
    const { route, params } = parseHash();
    navigate(route, params);
  });

  // Sidebar toggle (desktop)
  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed');
  });

  // Mobile menu button
  mobileMenuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Nav link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route as Route;
      navigate(route);
    });
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
      const target = e.target as Node;
      if (!sidebar.contains(target) && !mobileMenuBtn?.contains(target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search (if on models page)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('.model-search input') as HTMLInputElement;
      searchInput?.focus();
    }
    // Escape: Close modals, dropdowns, mobile sidebar
    if (e.key === 'Escape') {
      sidebar.classList.remove('open');
      document.querySelectorAll('.dropdown-menu, .modal-overlay').forEach(el => el.remove());
    }
  });
}

/**
 * Create the app shell HTML
 */
function createAppShell(): void {
  const appShell = `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
      <div class="sidebar-header">
        <div class="flex items-center gap-3">
          <div class="avatar avatar-lg avatar-assistant" aria-hidden="true">🤖</div>
          <div>
            <h1 class="font-semibold text-primary truncate">Local AI Chat</h1>
            <p class="text-xs text-muted truncate">WebLLM • Offline</p>
          </div>
        </div>
        <button id="sidebar-toggle" class="btn btn-ghost btn-icon" aria-label="Toggle sidebar" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto p-3">
        <ul class="flex flex-col gap-1" role="list">
          <li>
            <a href="#chat" data-route="chat" class="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="sidebar-label">Chat</span>
            </a>
          </li>
          <li>
            <a href="#models" data-route="models" class="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Model Library">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M8 21h8"></path>
                <path d="M12 17v4"></path>
              </svg>
              <span class="sidebar-label">Models</span>
            </a>
          </li>
          <li>
            <a href="#import" data-route="import" class="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Import/Export">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span class="sidebar-label">Import/Export</span>
            </a>
          </li>
          <li>
            <a href="#memory" data-route="memory" class="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Memory">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="15" y1="2" x2="15" y2="22"></line>
                <line x1="8" y1="2" x2="8" y2="22"></line>
              </svg>
              <span class="sidebar-label">Memory</span>
            </a>
          </li>
          <li>
            <a href="#settings" data-route="settings" class="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span class="sidebar-label">Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer p-3 border-t border-border-color">
        <div class="flex items-center gap-3">
          <div class="avatar avatar-sm avatar-assistant" aria-hidden="true">💡</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-muted truncate">Running locally via WebGPU</p>
          </div>
        </div>
      </div>
    </aside>

    <button id="mobile-menu-btn" class="btn btn-ghost btn-icon lg:hidden fixed bottom-4 right-4 z-dropdown" aria-label="Open menu" aria-expanded="false">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>

    <main class="main-content" role="main">
      <header class="header" style="height: var(--header-height);">
        <div class="flex items-center justify-between h-full px-4">
          <div class="flex items-center gap-3">
            <h2 id="page-title" class="font-semibold text-primary">Chat</h2>
          </div>
          <div class="flex items-center gap-2">
            <!-- Theme toggle will be inserted here by ThemeEngine -->
            <div id="theme-toggle-container"></div>
            <!-- Model selector will be inserted here by ChatPage -->
            <div id="header-model-selector"></div>
          </div>
        </div>
      </header>

      <div id="route-outlet" class="flex-1 overflow-hidden" role="region" aria-label="Page content"></div>
    </main>

    <!-- Toast container -->
    <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>
  `;

  document.getElementById('app')!.innerHTML = appShell;
}

/**
 * Show toast notification
 */
export function showToast(toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }): void {
  const container = document.getElementById('toast-container')!;
  const id = `toast-${Date.now()}`;

  const icons: Record<string, string> = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  };

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${toast.type}`;
  toastEl.id = id;
  toastEl.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${icons[toast.type]}</div>
    <div class="toast-content">
      <div class="toast-title">${toast.title}</div>
      ${toast.message ? `<div class="toast-message">${toast.message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  toastEl.querySelector('.toast-close')!.addEventListener('click', () => {
    toastEl.remove();
  });

  container.appendChild(toastEl);

  // Auto-dismiss
  const duration = toast.duration ?? 5000;
  setTimeout(() => {
    toastEl.style.animation = 'slideUp var(--transition-base) ease-in reverse';
    setTimeout(() => toastEl.remove(), 250);
  }, duration);
}

/**
 * Main bootstrap function
 */
async function bootstrap(): Promise<void> {
  try {
    // Create app shell
    createAppShell();

    // Initialize services
    const services = await initializeServices();

    // Initialize pages
    const pages = initializePages(services);

    // Set up global app state
    app = {
      currentRoute: 'chat',
      currentChatId: null,
      services,
      pages,
    };

    // Make app globally accessible for debugging
    (window as any).__APP__ = app;

    // Set up event listeners
    setupEventListeners();

    // Initial route
    const { route, params } = parseHash();
    navigate(route, params);

    // Show ready toast
    showToast({ type: 'success', title: 'Local AI Chat ready', message: 'All systems initialized', duration: 3000 });

    console.log('[Local AI Chat] Application initialized successfully');
  } catch (error) {
    console.error('[Local AI Chat] Failed to initialize:', error);
    showToast({
      type: 'error',
      title: 'Initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: 10000
    });
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export for testing
export { app, navigate, showToast, parseHash };